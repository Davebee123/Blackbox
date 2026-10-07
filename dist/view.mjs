// Markup builders. Pure functions of state; they never change it.
import { SALVAGE_COSTS, stacks as salvageStacks, canAfford, costLabel as salvageLabel, payProblem, total as salvageTotal, slug } from './salvage.mjs';
import { glyph } from './glyphs.mjs';
import { isLive, liveCount, memoryCap, memoryCost, joinCost, MEMORY } from './memory.mjs';
// The server whose Connect is waiting on a yes (app.js): its card shows the memory it takes.
let memAsk = null;
export const setMemAsk = (id) => { memAsk = id; };
import { fleetLeft, FLEET } from './fleet.mjs';
import { hubWall, HUBS, retakeOf, retakeLeft, lockedDown, incomeOf, bankOf, demandOf } from './hubs.mjs';
import { PAYLOADS, PAYLOAD, builtOf, flyingOf, lastStrike, defenceOf, alertOf, offline, forecastStrike } from './payload.mjs';
import { WARES, WARE_IDS, CONDITIONS, HUB_CONDITION, eventOf, quote, priceOf, travelMs, transfersOf, orderQuote, orderMax } from './market.mjs';
// The market's open order ticket (app.js): { f, w, side, n }.
let order = null;
export const setOrder = (o) => { order = o; };
import { FACTIONS as FX, FACTION_IDS, rep, repTier, REP_TIERS, hubsOf, hubOf, shopOf, hostile, OWNED, captured, donationOf, hubFound, hubTraceOf } from './factions.mjs';
import { GLYPHS } from './glyphs.mjs';
import { SKILL_TEXT } from './lore.mjs';
import { ARCHITECTURES, ARCH_LEVEL, ARCH_SWITCH, archOf, archCredits } from './architecture.mjs';
import { schedulerEvery, outpostBuyout, knowsPlan, planName, planPrice, relayCost, canBuildRelay, OUTPOST, BUILDINGS, bandwidth, bandwidthUsed, stockOf, capOf, makes, siteLabel, slotsOf, sizeOf as serverSize, buildingsOf, buildBlock, buildCost, costLine, isOutpost, hasMod } from './outpost.mjs';
import { ABILITIES, CONFIG, FAMILIES, MUTATIONS, TICKER, QUIRKS, DAEMONS, STRAINS, GUARDS } from './data.mjs';
import { currentLocation, takeable, takenOf, liveSpawns, zoneRooms, signalNow, zoneSpawns, TRACE } from './run.mjs';
import { ROGUE, rogueSpawns, rogueRooms, relockLeft } from './rogue.mjs';
import { eventsAt, eventsOf, eventText, eventMinutes, CARDS as EVENT_CARDS } from './events.mjs';
import { matesOf, mateUp, mateSignal } from './crew.mjs';
import { online, inSprawl, whereText, simOn, friends, profileOf } from './presence.mjs';
import { consortiumOf, isGround, sizeOf, tiersOf, nextTier as nextConTier, serversOf, memberServers, memberLevel, CONSORTIUM, dividendOf, dividendRate, dividendSources, dividendWaiting, dividendText, rebooting, consortiumWall, alertsOf, tiersOf as conTiers } from './consortium.mjs';
import { FACTIONS, MAIL, TIERS, openContracts, doneContracts, offers as mailOffers, findJob, heldCount, boardOpen, indemnity, tierIndex, standing, tierOf, nextTier, retainer, unread, title as contractTitle, progress as contractProgress, rewardLine, ready as contractReady, nextPayIn } from './mail.mjs';
import { commsOf, GROUPS as COMMS_GROUPS, groupOf as commsGroup } from './comms.mjs';
import { LINE, GOODS, storeOf, lineName, lineAbout, goodsAbout, priceNow } from './store.mjs';
import { shownHidden, flagged as hiddenFlagged, items as kitOf, HIDDEN } from './hidden.mjs';
import { archWall } from './architecture.mjs';
import { ROOT, ROOT_PERKS, rootOf, rootProgress, procOf, freeOfMemory } from './root.mjs';
import { FIREWALL, fwOf, fwAt, ratingAt, effLevel, wallBonus, fragLevels, defragging, hardenLeft, upgradeCost, canPay, defragMs, defragCost, versionOf, perksAt, VERSION_PERKS, VERSION_EVERY } from './firewall.mjs';
import { filtersOf, equipped as filtersOn, slotsOf as filterSlots, filterLine, FILTER_STATS, CRAFTABLE, filterCost, FILTER_CAP, baseName as filterBase, filterRecipes } from './filters.mjs';
import { wallRating, wallBands, ratioOf, outcome, chipRate, grindRate, fighting, degradedLeft, fmtLeft } from './invasion.mjs';
import { ports, LOOT, SLOTS, BASES, STATS, GROUPS, RARITIES, RARITY_ORDER, ZERO_DAYS, STASH_CAP, PROTOCOL_SLOTS, PROTOCOL_STATS, SERVICES, VERSIONS, MATERIALS, statLine, itemLabel, fmtStat, sideStats, serviceCost, BLUEPRINTS, PROTOCOL_NAMES, recipeStat, SLOT_KINDS, groupOf, codeOf } from './gear.mjs';
import { ARCHETYPES, CANTRIPS, EDGE, SYNC, STATUSES, LOADOUT, TREE, SERVER, SKILLS, xpToNext, unlockLevel, power } from './data.mjs';
import { XP_KINDS, xpFor, watchmanBar, cooldownOf, skillBase, knowsPart, codexKey, installBuyout, previewDamage, ignoresArmor, blocked, drawingFire, momentumStacks, momentumBonus, topUpCost, UNIQUES, effectLine, paceOf, keyMap, classOf, CANTRIP_IDS, hackerOf, hackerLevel, nextUnlock, serverLevel, serverProgress, daemonSlots, procOpen, slottedDaemons, daemonVersion, daemonNext, daemonAmount, talentPoints, loaded, loadedOn, slotCount, maxSignal, compileCost, materialsOf, serviceVersion, serviceValue, installBlock, portsUsed, portCount, cronDamage, gearStat, critChance, critMultiplier, missChance, enemyMissChance, defense, powerOf, levelGap, zeroDay, rootkitReady, cronDue, picksOf, ranksOf, freeSlot, rigOf, stashItem, knows, knownRecipes, pointsSpent, tierState, rowState, spentAbove, knownSkills, equippedSkills, cycleLength, familyInfo, defender, active, alive, virusIntegrity, armorLeft, intents, patches, readyIn, timersHidden, part } from './combat.mjs';

// WoW-style level colors: how an enemy's level compares with yours.
export const conClass = (gap) => (gap >= 5 ? 'con-red' : gap >= 3 ? 'con-orange' : gap >= -2 ? 'con-yellow' : gap > -10 ? 'con-green' : 'con-gray');
// A short code for an attack when its name won't fit (Surge → SRG, Encrypt → ENC): never an ellipsis.
// Name and effect together too wide for a narrow cell: show the code instead of clipping the name.
const longChip = (i) => i.name.length > 6 || i.name.length + String(effectLabel(i)).length > 14;
export const attackCode = (name = '') => (name[0] + name.slice(1).replace(/[aeiou\s'-]/gi, '')).slice(0, 3).toUpperCase();
const levelTag = (s, level, label = `Level ${level}`) => `<b class="${conClass(level - hackerLevel(s))}" title="${level > hackerLevel(s) ? `${level - hackerLevel(s)} levels above you` : level < hackerLevel(s) ? `${hackerLevel(s) - level} levels below you` : 'your level'}">${label}</b>`;
// Skill text with this level's numbers: every level adds 4% to damage, heals and shields.
export function scaledText(s, id, text, arch = null) {
  const a = ABILITIES[id];
  const k = arch ? power(hackerLevel(s, arch)) : powerOf(s);
  if (!a || !text || k === 1) return text;
  const nums = ['damage', 'heal', 'shield', 'tick', 'helper', 'all'].map((f) => a[f]).filter(Boolean);
  if (id === 'counter') nums.push(SKILLS.fixedCounter);
  if (id === 'hook') nums.push(SKILLS.hooked);
  let out = text;
  for (const n of [...new Set(nums)]) out = out.replace(new RegExp(`(^|[^\\d.×])${n}(?![\\d%])`, 'g'), (m, pre) => `${pre}${Math.max(1, Math.round(n * k))}`);
  return out;
}

// A strain's name (its rule on hover) and its live state: keystrokes logged, asleep.
function strainTags(s, v) {
  const ice = GUARDS[v.family]?.ice && GUARDS[v.family];
  if (ice) return ` <span class="tag tag-strain" data-strain="${v.family}" title="${esc(`${ice.name} (ICE). ${ice.rule}`)}">${esc(ice.name)} ICE</span>`;
  const st = v.strain && STRAINS[v.strain];
  if (!st) return '';
  const e = s.encounter;
  const logger = v.parts.find((p) => p.syncOnly && p.integrity > 0);
  const fighting = e?.phase === 'active';
  const shade = v.parts.find((p) => p.phase && p.integrity > 0);
  const live = logger && fighting ? ` · ${e.keylog || 0}/3 logged` : v.dormant ? ' · asleep' : shade && fighting ? (e.cycle % 2 ? ' · out of phase' : ' · in phase') : '';
  const hot = logger && (e?.keylog || 0) >= 2;
  return ` <span class="tag tag-strain${hot ? ' hot' : ''}" data-strain="${v.strain}" title="${esc(`${st.name} (${familyInfo(v.family).name} strain). ${st.rule}`)}">${esc(st.name)}${live}</span>`;
}
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICON = { damage: 'server', encrypt: 'event-lock', scramble: 'scan', replicate: 'mutation', heal: 'shell-shield', mirror: 'interrupt', reboot: 'pulse-node' };
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const effectLabel = (i) => (i.effect === 'damage' ? `−${i.amount}` : (i.hit ? `−${i.hit} · ` : '') + (i.effect === 'encrypt' ? `+${i.amount}` : i.effect === 'scramble' ? `${i.amount} cyc` : i.effect === 'heal' ? `+${i.amount} hp` : i.effect === 'mirror' ? `${i.amount}% back` : i.effect === 'reboot' ? `${i.amount} hp` : '+frag'));
const TARGETS = { damage: 'Integrity', encrypt: 'damage every cycle, stacking, until it breaks', scramble: 'your attacks may hit you', replicate: 'spawns a fragment', heal: 'to its most damaged part', mirror: 'your command does nothing this cycle, and some bounces back', reboot: 'comes back, unless its twin is broken first' };
let runMode = false;
const effectTarget = new Proxy(TARGETS, { get: (t, k) => (k === 'damage' && runMode ? 'Signal' : t[k]) });

// Armor chits on a part: filled = still there, hollow = broken.
// breaking: chits this cycle's hits will break (the forecast); they blink, like the white slices.
export function chitsMarkup(p, breaking = 0) {
  if (!p.maxArmor) return '';
  const going = Math.min(breaking, p.armor);
  return `<span class="chits" title="Armor: ${p.armor} of ${p.maxArmor}.${going ? ` ${going} breaks this cycle.` : ''} A hit on armor does no damage and breaks one ◆; armor-piercing hits go through.">${'◆'.repeat(p.armor - going)}${going ? `<b class="going">${'◆'.repeat(going)}</b>` : ''}<i>${'◇'.repeat(p.maxArmor - p.armor)}</i></span>`;
}
const VEIL_NOTE = 'Veiled: timers stay hidden while its parts are armored. Strip the armor, or Tag a part to see its timer.';
const hiddenNote = (s) => {
  const e = s.encounter;
  return VEIL_NOTE;
};

export function headMarkup(s) {
  const e = s.encounter, v = e.virus;
  const m = v.mutation ? MUTATIONS[v.mutation] : null;
  const weak = v.weakKnown ? part(s, v.weakPoint) : null;
  const status = e.phase === 'active' ? (e.paused ? '<span class="tag">Paused</span>' : '') : `<span class="tag ${e.phase === 'crashed' ? 'hot' : ''}">${esc(e.phase === 'alert' ? 'Not engaged' : e.phase)}</span>`;
  return `<h1>${esc(v.name)}</h1>
    <span class="meta">${levelTag(s, v.level)} ${esc(familyInfo(v.family).name)}${e.mode === 'run' ? ' · on a run' : ''}</span>
    <span class="tag" title="What this family goes after">threatens ${esc(v.threatens)}</span>
    ${m ? `<span class="tag" title="${esc(m.rule)}">${esc(m.name)}</span>` : ''}
    ${weak ? `<span class="tag you">weak point: ${esc(weak.name)}</span>` : ''}
    ${status}
    ${m ? `<p class="mutation-rule">${esc(m.name)}: ${esc(m.rule)}</p>` : ''}`;
}

export function barMarkup(s) {
  const e = s.encounter, hp = virusIntegrity(s);
  const pct = hp.max ? (hp.current / hp.max) * 100 : 0;
  const armor = armorLeft(s);
  return `<div class="bar-top"><strong>Virus Integrity</strong><span>${hp.current} / ${hp.max}</span></div>
    <div class="bigbar" role="progressbar" aria-label="Virus Integrity" aria-valuemin="0" aria-valuemax="${hp.max}" aria-valuenow="${hp.current}"><span style="width:${pct}%"></span></div>
    <p class="clock-line">armor ${armor.current}/${armor.max} ◆ · cycle ${e.cycle}</p>`;
}

export function partsMarkup(s, selected) {
  const e = s.encounter;
  runMode = e.mode === 'run';
  const nowSources = new Set(intents(s, 1).filter((i) => !i.hidden).map((i) => i.source));
  const hidden = timersHidden(s);
  return e.virus.parts
    .map((p) => {
      const broken = !alive(p);
      const tags = [];
      if (broken) tags.push('<span class="tag dim">broken</span>');
      else {
        if (p.maxArmor) tags.push(chitsMarkup(p));
        if (p.exposedUntil >= e.cycle) tags.push(`<span class="tag you" title="+50% damage">exposed ${p.exposedUntil - e.cycle + 1}</span>`);
        if (e.virus.weakKnown && e.virus.weakPoint === p.id) tags.push('<span class="tag you" title="+50% damage for the rest of the fight">weak</span>');
        if (p.boosted) tags.push('<span class="tag hot" title="Reactive: next attack is 50% stronger">reactive</span>');
      }
      const does = p.attack
        ? `${esc(p.attack.name)} ${effectLabel({ ...p.attack })} ${effectTarget[p.attack.effect]}${timersHidden(s, p) ? '' : ` · every ${p.attack.interval}`}`
        : '';
      const pct = (p.integrity / p.max) * 100;
      const dmg = previewDamage(s, 'spike', p);
      return `<button type="button" class="part ${broken ? 'broken' : ''} ${selected === p.id ? 'selected' : ''} ${nowSources.has(p.id) ? 'now' : ''}" data-target="${esc(p.id)}" ${broken || !active(s) ? 'disabled' : ''} title="${broken ? 'Broken' : `Target ${esc(p.name)} — spike deals ${dmg}`}">
        <span class="part-top"><span class="part-name">${esc(p.name)}</span><span class="part-hp">${p.integrity}/${p.max}</span></span>
        <span class="part-bar"><span style="width:${pct}%"></span></span>
        <span class="part-does">${does}</span>
        <span class="part-tags">${tags.join('')}</span>
      </button>`;
    })
    .join('');
}

function youChip(s) {
  const e = s.encounter;
  if (e.queue) return `<div class="intent mine"><b>You:</b> ${esc(e.queue.text)}</div>`;
  if (e.lastAttack) return `<div class="intent mine" title="Nothing typed: you Spike the last part you hit"><b>You:</b> ${esc(e.lastAttack)} <small>auto</small></div>`;
  return '<div class="intent mine"><b>You:</b>&nbsp;nothing queued <small>pick a target</small></div>';
}

export function timelineMarkup(s) {
  const e = s.encounter;
  runMode = e.mode === 'run';
  if (!active(s)) return `<p class="quiet" style="grid-column:1/-1">${e.phase === 'alert' ? 'Type engage to start the fight.' : 'The fight is over.'}</p>`;
  const list = intents(s, 4);
  const hidden = timersHidden(s);
  const remaining = Math.max(0, (CONFIG.cycleMs - e.elapsedMs) / 1000);
  const cols = [0, 1, 2, 3].map((c) => {
    const items = hidden ? [] : list.filter((i) => i.col === c);
    const chips = items
      .map((i) => `<div class="intent ${c === 0 ? 'now' : c === 1 ? 'next' : ''}" title="${esc(i.name)} from ${esc(part(s, i.source)?.name)}: ${effectLabel(i)} ${effectTarget[i.effect]}"><span class="ico" ${icon(ICON[i.effect])}></span><b${longChip(i) ? ' class="long"' : ''}>${esc(i.name)}</b><i class="code${longChip(i) ? ' long' : ''}">${esc(attackCode(i.name))}</i><small>${effectLabel(i)}</small></div>`)
      .join('');
    const quiet = !hidden && !items.length ? `<span class="quiet">${runMode ? 'quiet' : 'quiet · trace lands'}</span>` : '';
    const head = c === 0
      ? `<div class="tcol-head"><span>Now</span><span class="countdown" id="countdown">${e.paused ? 'II' : remaining.toFixed(1)}</span></div><div class="cyclebar"><span id="cyclebar" style="width:${(e.elapsedMs / CONFIG.cycleMs) * 100}%"></span></div>${youChip(s)}`
      : `<div class="tcol-head"><span>+${c}</span></div>`;
    return `<div class="tcol">${head}${chips}${quiet}</div>`;
  });
  const hiddenRow = hidden
    ? `<div class="hidden-row"><span class="tag" title="${esc(hiddenNote(s))}">Veiled</span> ${[...new Set(list.map((i) => i.name))].map((n) => `<span class="tag dim">${esc(n)}</span>`).join(' ')}</div>`
    : '';
  return cols.join('') + hiddenRow;
}

// ---------- combat HUD and board ----------

// The fight at a glance: the virus's health against yours.
// What this cycle is about to cost, before it resolves: the damage your command and each
// crewmate's will do to each part (a hit on an armored part only breaks a chit), and the damage
// the virus's visible attacks will do to you and the crew (after chits, shields and Block).
// Crits and misses aren't guessed. Shown as a blinking white slice at the end of each bar.
// preview: what you're typing (app.js), counted instead of your queued command while it would go through.
export function forecast(s, preview = null) {
  const e = s.encounter, out = { parts: {}, chits: {}, total: 0, you: 0, mates: {} };
  if (!active(s)) return out;
  const crew = e.mode === 'run' ? matesOf(s).filter((m) => m.encounter && mateUp(m)) : [];
  const armor = Object.fromEntries(e.virus.parts.map((p) => [p.id, p.armor]));
  const shoot = (st, q) => {
    const a = ABILITIES[q?.ability];
    if (!q?.target || !a) return;
    const p = part(st, q.target);
    if (!alive(p)) return;
    const was = p.armor; p.armor = 0;
    const dmg = previewDamage(st, q.ability, p);
    p.armor = was;
    const breaks = (n) => { const k = Math.min(n, armor[p.id]); armor[p.id] -= k; if (k) out.chits[p.id] = (out.chits[p.id] || 0) + k; };
    if (a.strip) return breaks(a.strip); // Crack: chits, no damage
    if (!dmg && !a.tick) return; // Tag and the like: no hit, no chit
    // A hit (or a burn's first tick) on armor breaks one chit; a heavy hit (CONFIG.heavyHit) or a skill with chits: 2 (Rate Limit, Reclaim) two.
    if (armor[p.id] > 0 && !ignoresArmor(st, q.ability)) return breaks(a.chits > 1 || (!a.tick && skillBase(st, q.ability, p) >= CONFIG.heavyHit * powerOf(st) - 1e-9) ? 2 : 1);
    out.parts[p.id] = Math.min(p.integrity, (out.parts[p.id] || 0) + dmg);
  };
  const auto = !e.queue && e.lastAttack ? { ability: e.lastAttack.split(' ')[0], target: e.lastAttack.split(' ')[1] } : null;
  shoot(s, preview?.ok && preview.ability ? preview : e.queue || auto);
  for (const m of crew) shoot(m, m.encounter.queue);
  out.total = Object.values(out.parts).reduce((a, b) => a + b, 0);
  // Incoming: this cycle's visible damage attacks, plus encryption on you.
  const hits = intents(s, 1).filter((i) => i.col === 0 && !i.hidden && (i.effect === 'damage' || i.hit)).map((i) => (i.effect === 'damage' ? i.amount : i.hit));
  const take = (st, raw) => {
    let chits = st.encounter.chits || 0, shield = st.encounter.shield || 0, lost = 0;
    for (const a of raw) {
      if (chits > 0) { chits--; continue; }
      let n = blocked(st, a);
      const soak = Math.min(shield, n); shield -= soak; n -= soak;
      lost += n;
    }
    return lost;
  };
  const tank = crew.length ? (drawingFire(s) ? s : crew.find((m) => drawingFire(m))) : null;
  out.you = Math.min(defender(s).integrity, (tank && tank !== s ? 0 : take(s, hits)) + (e.encrypt || 0));
  for (const m of crew) out.mates[m.who] = Math.min(m.run.integrity, tank && tank !== m ? 0 : take(m, hits));
  return out;
}
// The blinking slice on a bar: from what's left after the hit up to where the bar is now.
const lossMark = (now, max, loss) => (loss > 0 && max > 0 ? `<i class="loss" style="left:${((now - loss) / max) * 100}%;width:${(loss / max) * 100}%" title="−${loss} this cycle"></i>` : '');

export function hudMarkup(s, { party = true, preview = null } = {}) {
  const e = s.encounter, v = e.virus;
  runMode = e.mode === 'run';
  const hp = virusIntegrity(s);
  const vp = hp.max ? (hp.current / hp.max) * 100 : 0;
  const d = defender(s);
  const dp = (d.integrity / d.max) * 100;
  const mine = runMode ? 'Your Signal' : 'Your server';
  const level = dp <= 30 ? 'low' : dp <= 60 ? 'mid' : 'ok';
  const m = v.mutation ? MUTATIONS[v.mutation] : null;
  const weak = v.weakKnown ? part(s, v.weakPoint) : null;
  const armor = armorLeft(s);
  const fc = forecast(s, preview);
  // No title of its own: the virus's name labels its health bar, its tags sit under the bar with
  // its armor. Your bar and the crew's window come first; the virus's bar is at the right.
  const tags = `${v.elite ? '<span class="tag tag-crew" title="Elite: built for a crew. Much tougher; three times the XP, three loot rolls, a blue at least.">◆ CREW</span>' : ''}${e.invader && s.invasion?.id === e.invader ? `<span class="tag hot">invasion · ${esc(s.invasion.fromName)}</span>` : ''}${m ? `<span class="tag tag-mut" data-mut="${v.mutation}" title="${esc(m.rule)}">${esc(m.name)}</span>` : ''}${strainTags(s, v)}${weak ? `<span class="tag you">weak: ${esc(weak.name)}</span>` : ''}`;
  // Yours first (what you watch): your Signal with the crew under it; the virus's total at the right,
  // over its picture.
  return `<div class="hud-left"><div class="hud-you"><div class="hud-bar mine ${level}"><div class="bar-top"><strong>${glyph(runMode ? 'signal' : 'integrity', 'bar-ico')}${mine}</strong><span>${d.integrity}<small>/${d.max}</small></span></div><div class="bigbar"><span style="width:${dp}%"></span>${lossMark(d.integrity, d.max, fc.you)}</div></div></div>${statusPanel(s)}</div>
    <div class="hud-bar enemy"><div class="bar-top"><span class="vname"><strong>${esc(v.name)}</strong><span class="meta">${levelTag(s, v.level)}${v.strain || GUARDS[v.family]?.ice ? '' : ' ' + esc(familyInfo(v.family).name)}</span></span><span>${hp.current}<small>/${hp.max}</small></span></div><div class="bigbar"><span style="width:${vp}%"></span>${lossMark(hp.current, hp.max, fc.total)}</div><p class="clock-line">${armor.max ? `<span class="chits">${'◆'.repeat(armor.current)}<i>${'◇'.repeat(armor.max - armor.current)}</i></span>` : ''}${tags}</p></div>`;
}

// Everything on you right now, between your bar and the virus's: timed effects (with the cycles
// they have left) and standing ones (encryption, shield, armor, Clock Speed, …). Was a row on the
// board and tags in your row; here it sits by your health.
function statusPanel(s) {
  if (!active(s)) return '<div class="hud-status"></div>';
  // Just the names, in their colours; the numbers, how long and the rule in a quick tooltip.
  const timed = statusSpans(s).map((x) => ({ name: x.name, kind: x.kind, tip: `${x.value ? x.value + ' · ' : ''}${x.cycles} ${x.cycles === 1 ? 'cycle' : 'cycles'} left${x.title ? `\n${x.title}` : ''}` }));
  const all = [...timed, ...youStanding(s)];
  const chips = all.map((x) => `<span class="st ${x.kind}" data-tip="${esc(x.tip)}" tabindex="0">${esc(x.name)}</span>`).join('');
  return `<div class="hud-status"><div class="bar-top"><strong>Status</strong></div><div class="st-list">${chips || '<small class="quiet">nothing on you</small>'}</div></div>`;
}


function attackChip(i, c, k = '', to = null) {
  return `<div class="intent ${c === 0 ? 'now' : c === 1 ? 'next' : ''}" ${k ? `data-k="${esc(k)}"` : ''} title="${esc(i.name)}: ${effectLabel(i)} ${to ? `at ${esc(to)}` : effectTarget[i.effect]}"><span class="ico" ${icon(ICON[i.effect])}></span><b${longChip(i) ? ' class="long"' : ''}>${esc(i.name)}</b><i class="code${longChip(i) ? ' long' : ''}">${esc(attackCode(i.name))}</i><small>${effectLabel(i)}</small>${to ? `<small class="at">→ ${esc(to)}</small>` : ''}</div>`;
}

// What you've put on a part, as marks by its name (an icon each) and a class on its row, so a
// debuffed part reads at a glance. Exposed also hatches its bar: it's open.
const MARKS = { exposed: 'crit', tagged: 'ids', hooked: 'injector', throttled: 'debuff', quarantined: 'stun', burn: 'burn', helper: 'daemon' };
export function partMarks(s, p) {
  const e = s.encounter;
  if (!alive(p)) return [];
  const out = ['exposed', 'tagged', 'hooked', 'throttled', 'quarantined'].filter((k) => p[k + 'Until'] >= e.cycle);
  if ((e.burns || []).some((b) => b.target === p.id)) out.push('burn');
  if (e.helpers?.some((h) => h.target === p.id)) out.push('helper');
  return out;
}
const marksMarkup = (marks) => (marks.length ? `<span class="pmarks">${marks.map((k) => `<span class="pmark m-${k}" title="${k}">${glyph(MARKS[k])}</span>`).join('')}</span>` : '');

// The codex page card: every component, by virus; the ones you've broken say what they do.
export function codexMarkup(s) {
  const groups = [...Object.entries(FAMILIES).map(([k, f]) => [k, f.name, f.parts]), ...Object.entries(STRAINS).map(([k, st]) => [k, st.name, st.parts]), ...Object.entries(GUARDS).map(([k, g]) => [k, g.name, g.parts])];
  const all = groups.flatMap(([k, , parts]) => parts.map((p) => `${k}:${p.id}`));
  const known = all.filter((k) => s.codex?.[k]).length;
  // What you've never met stays ??? (names too): nothing spoils what's out there.
  const met = (k, parts) => !!s.met?.[k] || parts.some((p) => s.codex?.[`${k}:${p.id}`]);
  return `<section class="card codex-card"><h2>Codex · ${known}/${all.length}</h2><div class="codex">${groups.map(([k, name, parts]) => `<div class="cx-group${met(k, parts) ? '' : ' unmet'}"><b>${met(k, parts) ? esc(name) : '???'}</b><ul>${parts.map((p) => { const on = !!s.codex?.[`${k}:${p.id}`]; return `<li class="${on ? 'on' : ''}"><span>${met(k, parts) ? esc(p.name) : '???'}</span><small>${on ? esc(partAbout(p)) : '???'}</small></li>`; }).join('')}</ul></div>`).join('')}</div></section>`;
}
// The collection log: every unique and trophy, found or not. Hidden until your first one; one you
// haven't found shows where it comes from (a strain's name only once you've met that strain).
const collSource = (s, src) => !src ? '' : src.kind === 'sprawl' ? 'SPRAWL-00' : src.kind === 'vault' ? `Layer ${src.layer || 1} vaults`
  : src.kind === 'guard' ? `${GUARDS[src.id]?.name || src.id} guard` : src.kind === 'strain' ? (s.met?.[src.id] ? `${STRAINS[src.id]?.name} trophy` : '???')
  : src.kind === 'rogue' ? `${ROGUE.kinds[src.id]?.name || 'Rogue'} servers` : src.kind === 'story' ? 'Storyline' : src.kind === 'contract' ? 'Contract reward' : src.kind === 'store' ? 'Halcyon store' : '';
export function collectionMarkup(s) {
  const got = s.collection || {}, all = Object.values(UNIQUES);
  const n = all.filter((u) => got[u.id]).length;
  if (!n) return '';
  const rows = all.slice().sort((a, b) => a.level - b.level).map((u) => {
    const src = collSource(s, (u.sources || [])[0]);
    return got[u.id]
      ? `<li class="on" title="${esc(UNIQUES[u.id].flavour || '')}"><b class="iname r-zeroday">${esc(u.name)}</b><small>Lv ${u.level} · ${esc(src)}</small></li>`
      : `<li><span class="coll-q">???</span><small>Lv ${u.level} · ${esc(src)}</small></li>`;
  }).join('');
  return `<section class="card coll-card"><h2>Collection · ${n}/${all.length}</h2><div class="sb-bar coll-bar"><i style="width:${Math.round((n / all.length) * 100)}%"></i></div><ul class="coll">${rows}</ul></section>`;
}

const partName = (id) => ({ encryptor: 'Encryptor', replicator: 'Replicator' }[id] || id);
// What a component does, in a line (the codex). ??? until you've broken one.
export function partAbout(p) {
  const a = p.attack, out = [];
  if (a) {
    const every = a.interval && a.interval < 900 ? ` every ${a.interval} ${a.interval === 1 ? 'cycle' : 'cycles'}` : '';
    if (a.effect === 'damage') out.push(a.dump ? `${a.name}: a big hit once it has logged 3 keystrokes` : a.alarm ? `${a.name}: raises the alarm, then hits ${a.amount}${every}` : `${a.name}: hits you for ${a.amount}${every}${a.ramp ? ', more each time' : ''}${a.siphon ? ', and heals itself' : ''}${a.grow ? ', growing as the fight goes on' : ''}${a.windup ? `; enough damage while it winds up calls it off` : ''}`);
    else if (a.effect === 'encrypt') out.push(`${a.name}: locks part of you, ${a.amount} more each time, until it breaks`);
    else if (a.effect === 'scramble') out.push(`${a.name}: ${a.hit ? `hits ${a.hit} and ` : ''}scrambles you for ${a.amount} cycles: each of your attacks may hit you instead, at half${every}`);
    else if (a.effect === 'heal') out.push(`${a.name}: repairs the most damaged part by ${a.amount}${every}`);
    else if (a.effect === 'replicate') out.push(`${a.name}: spawns fragments that gnaw you${every}`);
  }
  if (p.veiled) out.push('hides its timers while it has armor');
  if (p.phase) out.push('only there on even cycles');
  if (p.syncOnly) out.push('only commands in a Sync Window hurt it');
  if (p.tax) out.push('slows your cooldowns while it lives');
  if (p.echo) out.push('every hit you take repeats at half');
  if (p.rearm) out.push(`re-arms another part every ${p.rearm} cycles`);
  if (p.overrun) out.push('its fragments overrun you');
  if (p.ward) out.push(`wards the ${partName(p.ward)}: it loses at most ${Math.round(CONFIG.ward * 100)}% of itself a cycle while this lives`);
  if (p.twin) out.push(`twinned with the ${partName(p.twin)}: break one while the other lives and it reboots, so break both`);
  if (p.reflect) out.push(`every ${p.reflect} cycles it mirrors your commands: they do nothing, and some bounces back`);
  return out.map((x) => x.replace(/^./, (c) => c.toUpperCase())).join('. ') + (out.length ? '.' : '') || 'It has no attack of its own.'; // each its own sentence
}
function partTags(s, p) {
  const e = s.encounter, tags = [];
  if (p.veiled && p.armor > 0) tags.push(`<span class="tag" title="${VEIL_NOTE}">veiled</span>`);
  if (p.exposedUntil >= e.cycle) tags.push(`<span class="tag you" title="Exposed: every hit on it has +25% crit chance">exposed ${p.exposedUntil - e.cycle + 1}</span>`);
  if (e.virus.weakKnown && e.virus.weakPoint === p.id) tags.push('<span class="tag you" title="+50% damage for the rest of the fight">weak</span>');
  if (p.taggedUntil >= e.cycle) tags.push(`<span class="tag you" title="Tagged: +25% damage from anyone; its timer shows even if it's veiled">tagged ${p.taggedUntil - e.cycle + 1}</span>`);
  if (p.hookedUntil >= e.cycle) tags.push(`<span class="tag you" title="Hooked: every hit on it gets +6">hooked ${p.hookedUntil - e.cycle + 1}</span>`);
  if (p.throttledUntil >= e.cycle) tags.push(`<span class="tag you" title="Throttled: its attacks deal half">throttled ${p.throttledUntil - e.cycle + 1}</span>`);
  if (p.quarantinedUntil >= e.cycle) tags.push(`<span class="tag you" title="Quarantined: +25% damage while its attack waits">quarantined ${p.quarantinedUntil - e.cycle + 1}</span>`);
  if (p.phase && p.integrity > 0) tags.push(e.cycle % 2 ? '<span class="tag hot" title="Out of phase: hits pass through it this cycle, and a quarter of yours bounces back at you">phased out</span>' : '<span class="tag you" title="In phase: hit it now">in phase</span>');
  if (p.attack?.windup && p.attack.due - e.cycle <= 2 && p.integrity > 0) tags.push(`<span class="tag hot" title="Winding up: deal ${p.attack.windup} damage before it lands to call it off">wind-up ${p.attack.wound || 0}/${p.attack.windup}</span>`);
  if (p.enrage && p.integrity > 0 && p.integrity < p.max / 2) tags.push('<span class="tag hot" title="Below half: its attacks hit half again as hard">enraged</span>');
  if (p.rearm && p.integrity > 0) { const n = (p.rearm - (e.cycle % p.rearm)) % p.rearm; tags.push(`<span class="tag hot" title="Re-arms the other part to full armor at the end of every ${p.rearm}th cycle">${n ? `re-arms in ${n}` : 're-arms now'}</span>`); }
  if (p.attack?.grow && p.integrity > 0) tags.push(`<span class="tag hot" title="Its Trace-back grows every cycle the fight lasts">+${p.attack.bonus || 0}</span>`);
  if (p.echo && p.integrity > 0) tags.push('<span class="tag hot" title="Every hit you take repeats next cycle at half while this lives">echoing</span>');
  // Mutations: an Adaptive part one more cycle of hits from hardening; damage a Rerouting virus moved here.
  if (e.virus.mutation === 'adaptive' && p.integrity > 0 && p.adaptRun >= 2 && p.adaptAt === e.cycle - 1) tags.push('<span class="tag hot" title="Hit it again this cycle and it gains a ◆ at the end of the cycle">adapting</span>');
  if (p.rerouted && p.integrity > 0) tags.push(`<span class="tag hot" title="Rerouted from a broken part: its attack +${p.rerouted}">+${p.rerouted} rerouted</span>`);
  const burn = (e.burns || []).filter((b) => b.target === p.id);
  // Burns, one tag per kind: how many stacks (of how many it can take), and the damage a cycle in all.
  for (const name of [...new Set(burn.map((b) => b.name))]) {
    const mine = burn.filter((b) => b.name === name), cap = Object.values(ABILITIES).find((a) => a.name === name)?.stacks;
    const dmg = mine.reduce((n, b) => n + b.damage, 0);
    tags.push(`<span class="tag you burn-tag" title="${esc(`${name}: ${mine.length}${cap ? ` of ${cap}` : ''} ${mine.length === 1 ? 'stack' : 'stacks'} on it, ${dmg} damage a cycle in all. Cycles left: ${mine.map((b) => b.left).join(', ')}.`)}">${esc(name)}${mine.length > 1 || cap ? ` ×${mine.length}${cap ? `/${cap}` : ''}` : ''} · ${dmg}</span>`);
  }
  if (e.helpers?.some((h) => h.target === p.id)) tags.push(`<span class="tag daemon" title="Your helper hits it every cycle">helper</span>`);
  return tags.join('');
}

// Your own effects: shields up, helpers running.
// Standing effects on you (no timer): { name, kind, tip }.
function youStanding(s) {
  const e = s.encounter, out = [];
  const add = (name, kind, tip) => out.push({ name, kind, tip });
  if (e.encrypt > 0) add('Encrypted', 'hot', `−${e.encrypt} every cycle until the Encryptor breaks. Rollback wipes it; Lockdown stops more.`);
  if (gearStat(s, 'clock')) add('Clock Speed', 'you', `${Math.floor(e.clock || 0)}%. At 100%, every cooldown ticks one extra cycle.`);
  if (rootkitReady(s)) add('Rootkit', 'you', 'Ready: your first hit this fight goes through armor.');
  if (e.mode === 'home' && serviceVersion(s, 'snapshot') && !e.once?.snapshot) add('Snapshot', 'you', `Once this fight, dropping below half restores ${serviceValue(s, 'snapshot')}%.`);
  if (e.chits > 0) add('Armor', 'you', `${'◆'.repeat(e.chits)} The next attack on you does nothing, however big.`);
  if (e.shield > 0) add('Shield', 'you', `${e.shield}. Absorbs damage from attacks.`);
  if (e.helpers?.length) add('Helpers', 'daemon', `${e.helpers.length} running. They hit after you each cycle.`);
  return out;
}

// Timed effects on you, as bars across the cycle columns they cover (Now = this cycle).
export function statusSpans(s) {
  const e = s.encounter, out = [];
  const add = (name, until, kind, title, value = '') => { if (until >= e.cycle) out.push({ name, value, cycles: until - e.cycle + 1, kind, title }); };
  const st = momentumStacks(s);
  if (st) add('Momentum', e.momentum.until, 'you', `Momentum: +${Math.round(momentumBonus(s) * 100)}% damage (${st} of ${SKILLS.momentumMax} stacks). Each break adds a stack and resets the timer.`, `+${Math.round(momentumBonus(s) * 100)}%${st > 1 ? ` ×${st}` : ''}`);
  for (const [k, until] of Object.entries(e.buffs || {})) if (k !== 'null-route') add(k === 'sinkhole' ? 'Drawing fire' : ABILITIES[k]?.name || k, until, 'you', k === 'sinkhole' ? 'Every attack comes at you (Firewall, with a crew).' : ABILITIES[k]?.help || '');
  add('Null-routed', e.buffs?.['null-route'] ?? -1, 'you', "This cycle's attacks miss you, and your next skill crits.");
  add('Scrambled', e.scrambleUntil ?? -1, 'hot', `Each of your attacks has a ${Math.round(CONFIG.scramble.chance * 100)}% chance to hit you instead, at ${Math.round(CONFIG.scramble.self * 100)}%.`, `${Math.round(CONFIG.scramble.chance * 100)}% self-hit`);
  return out;
}

// Rows = parts, columns = cycles. Health and timing on the same line.
export function boardMarkup(s, selected, preview = null) {
  const e = s.encounter;
  runMode = e.mode === 'run';
  const fighting = active(s);
  const fc = forecast(s, preview);
  // Damage on the timeline is what you'll actually take after your Reduction.
  const list = fighting ? intents(s, 4).map((i) => (i.effect === 'damage' ? { ...i, amount: blocked(s, i.amount) } : i.hit ? { ...i, hit: blocked(s, i.hit) } : i)) : [];
  const hidden = fighting && timersHidden(s);
  const remaining = Math.max(0, (cycleLength(s) - e.elapsedMs) / 1000);
  const quietCol = (c) => fighting && !hidden && !list.some((i) => i.col === c);
  const head = `<div class="brow bhead"><div class="bcell bname">Part</div>
    <div class="bcell bnow"><span>Now <small class="cyc">cycle ${e.cycle}</small></span><span class="countdown" id="countdown">${!fighting ? '—' : e.paused ? 'II' : remaining.toFixed(1)}</span><div class="cyclebar">${e.sync && fighting ? `<i class="sync-win${e.sync.surprise ? ' surprise' : ''}" id="sync-win" style="left:${(e.sync.at * 100).toFixed(1)}%;width:${(e.sync.width * 100).toFixed(1)}%" title="${esc(e.sync.surprise ? `Surprise: fire while the bar is here. Inject lands an extra stack, Tag lasts ${CONFIG.surprise.tagCycles} cycles with burns +${Math.round((CONFIG.surprise.tagged - 1) * 100)}%, Keepalive stretches burns ${CONFIG.surprise.keepalive} cycles.` : `Sync Window: fire your command while the bar is here for +${Math.round(CONFIG.sync.bonus * 100)}% damage. ${SYNC[classOf(s)]?.rule || ''}`)}"></i>` : ''}<span id="cyclebar" style="width:${(e.elapsedMs / cycleLength(s)) * 100}%"></span></div></div>
    ${[1, 2, 3].map((c) => `<div class="bcell">+${c}${quietCol(c) && !runMode ? '<small class="quiet">quiet</small>' : ''}</div>`).join('')}</div>`;
  // Your row mirrors the parts: what you'll do in each upcoming cycle.
  const nowChip = e.queue
    ? `<div class="intent mine" data-k="you@${e.cycle}" data-at="${esc(e.queue.target || '')}" title="Enter on an empty line: go now">${esc(e.queue.text)}</div>`
    : e.lastAttack
        ? `<div class="intent mine auto" data-k="you@${e.cycle}" data-at="${esc(e.lastAttack.split(' ')[1] || '')}" title="Nothing typed: you Spike the last part you hit">${esc(e.lastAttack)} <small>auto</small></div>`
        : '<div class="intent mine idle">—</div>';
  const planCell = (i) => (e.plan[i] ? `<div class="intent mine plan" data-k="you@${e.cycle + 1 + i}" data-at="${esc(e.plan[i].target || '')}">${esc(e.plan[i].text)}</div>` : '');
  // Cron Job (server Zero-day): when the server hits on its own.
  const cron = fighting && e.mode === 'home' && serviceVersion(s, 'cron');
  // Your slotted daemons: each chip sits on the cycle it acts next.
  const dmn = fighting ? slottedDaemons(s).filter((id) => !DAEMONS[id].once) : [];
  const daemonCell = (c) => dmn.filter((id) => daemonNext(s, id) === e.cycle + c).map((id) => `<div class="intent daemon" data-k="daemon:${id}@${e.cycle + c}" title="${esc(DAEMONS[id].name)} v${daemonVersion(s, id)}: ${esc(daemonRule(s, id))}">${esc(DAEMONS[id].name.toLowerCase())}</div>`).join('');
  const cronCell = (c) => daemonCell(c) + (cron && cronDue(e.cycle + c) ? `<div class="intent daemon cron" data-k="cron@${e.cycle + c}" title="Cron Job (service): your server hits the soonest attacker for ${cronDamage(s)}">cron ${cronDamage(s)}</div>` : '');
  const you = () => fighting
    ? `<div class="brow byou${e.steps?.order?.[e.steps.next - 1] === 'you' ? ' acting' : ''}"><div class="bcell bname"><span class="you-top"><b>You</b></span></div><div class="bcell">${nowChip}${cronCell(0)}${quietCol(0) && !runMode ? '<small class="quiet">quiet</small>' : ''}</div><div class="bcell">${planCell(0)}${cronCell(1)}</div><div class="bcell">${planCell(1)}${cronCell(2)}</div><div class="bcell">${cronCell(3)}</div></div>`
    : `<div class="brow byou"><div class="bcell bname"><b>You</b></div><div class="bcell span4 quiet">${e.phase === 'alert' ? 'not engaged' : 'over'}</div></div>`;
  // Simulated crewmates (crew.mjs): a row each, with Signal and what they'll do this cycle.
  const crew = fighting && e.mode === 'run' ? matesOf(s).filter((m) => m.encounter) : [];
  const sink = crew.length ? (drawingFire(s) ? 'you' : crew.find((m) => mateUp(m) && drawingFire(m))?.who || null) : null;
  // Whose turn just played in a stepped cycle (crew.mjs): their row lights up.
  const actedWho = e.steps?.order?.[e.steps.next - 1], acted = actedWho ? crew.find((m) => m.who === actedWho) : null; // whose turn just played
  // Who's aiming at which part this cycle: their initials sit on the part's top-left corner.
  const initials = (h) => h.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'YO';
  const aimOf = (enc) => enc.queue?.target || (!enc.queue && enc.lastAttack ? enc.lastAttack.split(' ')[1] : null);
  const aims = {};
  if (fighting) {
    const add = (t, who, kind, text) => { if (t) (aims[t] ||= []).push({ who, kind, text }); };
    // While you type a command naming a part, your avatar previews it there (app.js previewAim).
    if (preview?.target) add(preview.target, s.profile?.handle || 'you', `you preview${preview.ok ? '' : ' bad'}`, preview.ok ? `${preview.text} (Enter to queue)` : preview.why);
    else add(aimOf(e), s.profile?.handle || 'you', 'you', e.queue?.text || e.lastAttack);
    for (const m of crew.filter(mateUp)) add(aimOf(m.encounter), m.who, 'crew', m.encounter.queue?.text);
  }
  const pips = (id) => (aims[id] ? `<span class="aim-pips">${aims[id].map((a) => `<span class="aim ${a.kind}" data-who="${esc(a.kind.startsWith('you') ? 'you' : a.who)}" title="${esc(a.who)}${a.text ? ': ' + esc(a.text) : ''}">${esc(initials(a.who))}</span>`).join('')}</span>` : '');

  // A part just broken stays a moment, dissolving (app.js sets _dyingUntil), before it joins the broken list.
  const dying = (p) => !alive(p) && p._dyingUntil > Date.now();
  const living = e.virus.parts.filter((p) => alive(p) || dying(p)), broken = e.virus.parts.filter((p) => !alive(p) && !dying(p));
  const patchList = fighting ? patches(s, 4) : [];
  const rows = living.map((p) => {
    const mine = list.filter((i) => i.source === p.id);
    const nowHit = mine.some((i) => i.col === 0);
    const pct = (p.integrity / p.max) * 100;
    const patch = patchList.find((x) => x.source === p.id);
    const cells = [0, 1, 2, 3].map((c) => {
      // Encryption is one ongoing drain: the full chip in Now, then a thin striped line through the
      // later cycles (it keeps going; hover it and it opens up to say so), so the one-off events in those cells stay readable.
      const crypting = e.encrypt > 0 && p.attack?.effect === 'encrypt';
      const cryptChip = !crypting ? '' : c === 0 ? `<div class="intent crypt" title="Encrypted: you lose ${e.encrypt} this cycle. Break ${esc(p.name)} to stop it.">−${e.encrypt} <small>encrypted</small></div>` : `<div class="crypt-line" data-label="−${e.encrypt} encrypted"></div>`;
      const patchChip = patch?.col === c ? `<div class="intent patch" data-k="patch:${esc(p.id)}@${e.cycle + c}" title="${esc(p.name)} patches one ◆ back at the end of ${c === 0 ? 'this cycle' : `cycle ${e.cycle + c}`}, unless you break it first">◆ patch</div>` : '';
      if (timersHidden(s, p) && p.attack) return `<div class="bcell">${cryptChip}<div class="intent hidden">?</div>${patchChip}</div>`;
      const hit = mine.find((i) => i.col === c);
      // With a crew, a damage attack lands on everyone, or on whoever is drawing fire.
      const to = crew.length && hit?.effect === 'damage' ? sink || 'all' : null;
      return `<div class="bcell">${cryptChip}${hit ? attackChip(hit, c, `${p.id}@${e.cycle + c}`, to) : ''}${patchChip}</div>`;
    }).join('');
    const spike = p.armor > 0 ? 'spike breaks a ◆' : `spike deals ${previewDamage(s, 'spike', p)}`;
    const marks = partMarks(s, p);
    // A redraw mid-dissolve picks the fade up where it was (a negative delay), not from the start.
    const fade = dying(p) ? ` style="animation-delay:-${Math.max(0, 1000 - (p._dyingUntil - Date.now()))}ms"` : '';
    return `<button type="button"${fade} class="brow bpart ${dying(p) ? 'dying' : ''} ${selected === p.id ? 'selected' : ''} ${nowHit ? 'now' : ''} ${p.maxArmor && !p.armor ? 'cracked' : ''} ${marks.map((k) => 'm-' + k).join(' ')}" data-target="${esc(p.id)}" ${fighting ? '' : 'disabled'} title="Target ${esc(p.name)}: ${spike}${knowsPart(s, e.virus, p) ? '' : ' · what it does: ???'}">
      <div class="bcell bname">${pips(p.id)}<span class="part-top"><span class="part-name" data-tip="${esc(knowsPart(s, e.virus, p) ? partAbout(p) : 'Unknown. Break one to learn what it does.')}">${esc(p.name)}${knowsPart(s, e.virus, p) ? '' : '<sup class="unk">?</sup>'}</span>${marksMarkup(marks)}${chitsMarkup(p, fc.chits[p.id] || 0)}<span class="part-hp">${p.integrity}/${p.max}</span></span><span class="part-bar"><span style="width:${pct}%"></span>${lossMark(p.integrity, p.max, fc.parts[p.id] || 0)}</span><span class="part-tags">${partTags(s, p)}</span></div>
      ${p.attack ? cells : '<div class="bcell span4"></div>'}</button>`;
  }).join('');
  const gone = broken.length ? `<div class="brow bbroken"><div class="bcell span5">Broken: ${broken.map((p) => esc(p.name)).join(', ')}</div></div>` : '';
  // Whose half is playing, across the top of the board (the board itself takes its colour: style.css).
  const ph = fighting ? phaseOf(s) : null, who = esc(e.virus.name.split('-')[0]);
  const strip = ph ? `<div class="phase-strip ph-${ph}" title="Each cycle: your move, then the virus's"><span class="ps-you">${ph === 'wait' ? 'Your move' : 'You'}</span><i>▸</i><span class="ps-them">${who}</span></div>` : '';
  return strip + head + you() + rows + gone;
}

const LOG_CLASS = { reroute: 'bad', miss: 'warn', evaded: 'good', regen: 'dim', 'pack-hit': 'bad', heal: 'good',  resolved: 'you', 'server-hit': 'bad', encrypt: 'bad', encrypted: 'bad', decrypted: 'good', blind: 'bad', spawn: 'bad', crashed: 'bad', broken: 'good', loot: 'good', victory: 'good', scan: 'good', trace: 'good', armor: 'you', patch: 'warn', warning: 'warn', 'daemon-set': 'daemon', fled: 'warn', interrupt: 'you', status: 'you', vault: 'note', hold: '', 'trace-lost': 'warn', 'warning-soft': 'warn', blocked: 'note', intrusion: 'note', engage: 'note', damage: 'you' };

// Whose half of the cycle is playing: 'you' (you and your crew), 'them' (the virus), or 'wait' (your move).
export function phaseOf(s) {
  const e = s.encounter, st = e?.steps, now = Date.now();
  // Each half stays lit a moment (app.js holds it), and yours always shows before theirs.
  if (e?._youUntil > now) return 'you';
  if (st?.after || e?._themUntil > now) return 'them';
  return st ? 'you' : 'wait';
}
// Which side a log line belongs to: yours teal, the virus's red.
const THEIRS = new Set(['server-hit', 'encrypt', 'encrypted', 'blind', 'spawn', 'patch', 'evaded', 'blocked', 'intrusion']);
const MINE_LOG = new Set(['damage', 'broken', 'miss', 'resolved', 'status', 'armor', 'interrupt', 'hold']);
export function logMarkup(s, limit = 60) {
  const start = s.logs.findLastIndex((e) => e.type === 'intrusion');
  const lines = s.logs.slice(Math.max(0, start)).filter((e) => e.type !== 'queued').slice(-limit);
  return lines.map((e) => `<li class="${e.who ? 'crew ' : ''}${THEIRS.has(e.type) && !e.who ? 'side-them' : MINE_LOG.has(e.type) || e.who ? 'side-you' : ''}"><span class="c">c${e.cycle}</span><span class="${e.auto === 'daemon' ? 'daemon' : LOG_CLASS[e.type] ?? ''}">${e.who ? `<b class="who">${esc(e.who)}</b> ` : ''}${esc(e.message)}</span></li>`).join('');
}

export function trayMarkup(s) {
  const e = s.encounter;
  const fighting = active(s);
  // Key 1 Spike, 2–8 your seven equipped skills.
  const cards = Object.entries(keyMap(s)).map(([key, id]) => {
    const a = ABILITIES[id];
    const cantrip = CANTRIP_IDS.includes(id);
    if (!a) {
      const sk = ARCHETYPES[classOf(s)].skills.find((x) => x.id === id);
      const note = sk?.verb === 'run' ? 'on runs' : 'not in fights yet';
      return `<button type="button" class="ability cooling" disabled title="${esc(sk?.rule || '')}"><span class="ico" ${icon('command')}></span><span class="name"><kbd>${key}</kbd>${esc(sk?.name || id)}</span><span class="state">${note}</span></button>`;
    }
    const wait = fighting ? readyIn(s, id) : 0;
    const queued = fighting && (e.queue?.ability === id || (id === 'fork' && e.queue?.fork));
    const short = scaledText(s, id, a.short);
    // Procs: a lit key only works while its window is open; unlit, it waits.
    const lit = fighting && a.proc && procOpen(s, a.proc);
    const dark = fighting && a.proc && !lit;
    const state = !fighting ? short : queued ? 'queued' : dark ? 'waiting for its moment' : lit ? 'LIT' : wait ? (wait === 1 ? 'ready next cycle' : `ready in ${wait} cycles`) : short;
    // The charge bar along the bottom: full when it's ready, filling back up while it recharges.
    const cd = cooldownOf(s, id), charge = dark ? 0 : !fighting || !wait ? 100 : cd ? Math.round((1 - wait / Math.max(cd, wait)) * 100) : 0;
    const count = fighting && wait ? `<span class="cd" aria-label="${wait} ${wait === 1 ? 'cycle' : 'cycles'} to go">${wait}</span>` : '';
    return `<button type="button" class="ability ${cantrip ? 'cantrip' : ''} ${wait || dark ? 'cooling' : fighting ? 'ready' : ''} ${lit ? 'lit' : ''} ${queued ? 'queued' : ''}" data-ability="${id}" title="${esc(scaledText(s, id, a.help))}"><span class="ico" ${icon(a.icon)}></span><span class="name"><kbd>${key}</kbd>${esc(a.name)}</span><span class="state">${state}</span>${count}<span class="charge" style="width:${charge}%"></span></button>`;
  });
  // The next thing your level will unlock, as a faint slot.
  const nx = nextUnlock(s);
  if (nx) cards.push(`<div class="ability ghost" title="Unlocks at level ${nx.level}"><span class="name">Lv ${nx.level}</span><span class="state">${esc(nx.name)}</span></div>`);
  return cards.join('');
}

// ---------- pages ----------

const btn = (cmd, label, primary = false) => `<button type="button" class="btn ${primary ? 'primary' : ''}" data-command="${esc(cmd)}">${esc(label)}</button>`;
const stat = (label, value) => `<div class="stat"><span>${esc(label)}</span><strong>${value}</strong></div>`;

function locationList(s) {
  return `<ul class="list">${s.locations.map((l) => {
    const taken = takenOf(l), total = takeable(l).length;
    return `<li><span><b style="color:var(--bright)">${esc(l.name)}</b> · ${levelTag(s, l.level || 1, `Lv ${l.level || 1}`)} · ${esc(FAMILIES[l.family].name)} ${l.depth > 1 ? `· layer ${l.depth}` : 'origin'} · ${taken >= total ? 'cleaned out' : taken ? `${taken} of ${total} files banked` : l.runs ? 'partly explored' : 'unexplored'}</span>${s.run ? '' : btn('connect ' + l.id, 'Connect', !l.runs)}</li>`;
  }).join('')}</ul>`;
}

// ---------- protocols (you) ----------
const rarityClass = (it) => `r-${it.rarity}`;
const leadStat = (it) => Object.keys(it?.stats || {})[0] || 'protocol';
const itemTitle = (it) => [`${RARITIES[it.rarity]?.name || ''} ${SLOTS[groupOf(it)]?.name || ''}${it.base && BASES[it.base] && !it.unique && it.rarity !== 'custom' ? '' : it.base && BASES[it.base] ? ` (${BASES[it.base].name})` : ''}`.trim(), it.unique ? UNIQUES[it.unique]?.flavour : BASES[it.base]?.flavour].filter(Boolean).join('. ');
const itemName = (it) => `<b class="iname ${rarityClass(it)}" title="${esc(itemTitle(it))}">${glyph(leadStat(it), 'badge')}${esc(itemLabel(it))}</b>`;
// A unique's effect (or a found Zero-day's), under its stats.
const itemEffect = (it) => (it.zeroDay ? `<small class="zd">${esc(ZERO_DAYS[it.zeroDay].effect)}</small>` : it.unique && effectLine(it) ? `<small class="zd">${esc(effectLine(it))}</small>` : '');
const statsHtml = (it) => `<small>${Object.entries(it.stats).filter(([k]) => STATS[k]).map(([k, v]) => `<span class="${v < 0 ? 'neg' : ''}">${esc(statLine({ [k]: v }))}</span>`).join(' · ')}</small>`;

// The hover card for an item (app.js shows it, and spins its model): a rotating ASCII wireframe
// for its kind, in its rarity colour, over its name, rarity, kind, level, stats and effect.
export function itemTipMarkup(s, ref) {
  const f = ref?.startsWith('f:') ? filtersOf(s)[Number(ref.slice(2))] : null;
  const it = f || stashItem(s, ref);
  if (!it) return '';
  const kind = f ? 'filter' : groupOf(it), r = it.rarity;
  const stats = f ? `<span>${esc(filterLine(f))}</span>` : invStats(it);
  const where = !f && loadedOn(s, it.id) ? `<span class="tag dim">on ${esc(ARCHETYPES[loadedOn(s, it.id)].name)}</span>` : '';
  const flavour = !f && (it.unique ? UNIQUES[it.unique]?.flavour : BASES[it.base]?.flavour);
  const vs = f || loadedOn(s, it.id) === classOf(s) ? '' : swapCompare(s, it);
  return `<div class="ptip-card r-${r}"><pre class="ptip-art" data-shape="${kind}" aria-hidden="true"></pre><div class="ptip-body"><b class="iname r-${r}">${esc(f ? f.name : itemLabel(it))}</b><small>${esc(RARITIES[r]?.name || '')} ${esc(f ? 'filter' : SLOTS[kind]?.name || '')} · Lv ${it.level}</small>${where}<div class="ptip-stats">${stats}</div>${!f && (it.zeroDay || it.unique) ? itemEffect(it) : ''}${flavour ? `<em>${esc(flavour)}</em>` : ''}${vs}</div></div>`;
}
// Loading a stash protocol: what changes against what's in that slot now (▲ gains, ▼ losses).
function swapCompare(s, it) {
  const kind = groupOf(it), same = SLOT_KINDS.slice(0, slotCount(s)).indexOf(kind);
  if (same < 0) return '';
  const out = freeSlot(s, kind) < 0 ? stashItem(s, rigOf(s)[same]) : null;
  const keys = [...new Set([...Object.keys(it.stats || {}), ...Object.keys(out?.stats || {})])].filter((k) => STATS[k]);
  const rows = keys.map((k) => [k, (it.stats[k] || 0) - (out?.stats?.[k] || 0)]).filter(([, d]) => Math.abs(d) > 1e-9).sort((a, b) => b[1] - a[1])
    .map(([k, d]) => `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲ +' : '▼ −'}${fmtStat(k, Math.abs(d))} ${esc(STATS[k].name)}</span>`);
  const fx = (x) => x && (x.zeroDay ? ZERO_DAYS[x.zeroDay].name : x.unique ? x.name : '');
  if (fx(out) && fx(out) !== fx(it)) rows.push(`<span class="down">▼ ${esc(fx(out))}</span>`);
  return `<div class="ptip-vs"><small>${out ? `vs ${esc(itemLabel(out))}` : 'into an empty slot'}</small>${rows.length ? rows.join('') : '<span class="dim">no change</span>'}</div>`;
}

// The stash's filter (screen state only).
export const stashUi = { filter: 'all' };
// One item as an inventory row: rarity edge (CSS), slot glyph, name and level, then its stats in one line.
const invStats = (it) => Object.entries(it.stats).filter(([k]) => STATS[k]).map(([k, v]) => `<span class="${v < 0 ? 'neg' : ''}"><b>${v < 0 ? '−' + fmtStat(k, -v) : '+' + fmtStat(k, v)}</b> ${esc(STATS[k].name)}</span>`).join('');
function invBody(it, extra = '') {
  const fx = it.zeroDay ? ZERO_DAYS[it.zeroDay].effect : it.unique ? effectLine(it) : '';
  return `<span class="inv-icon" aria-hidden="true">${glyph(leadStat(it))}</span><span class="inv-main" data-ptip="${esc(it.id || '')}"><span class="inv-name"><b class="iname ${rarityClass(it)}">${esc(itemLabel(it))}</b><small>${esc(SLOTS[groupOf(it)]?.name || '')} · Lv ${it.level}</small>${extra}</span><span class="inv-stats">${invStats(it)}</span>${fx ? `<span class="inv-fx">${esc(fx)}</span>` : ''}</span>`;
}

// A character sheet for one side: every stat it can have, grouped, with totals (bases included).
function statSheet(s, side) {
  const total = (k) => {
    const v = gearStat(s, k, side);
    if (k === 'crit') return { v: critChance(s), text: `${critChance(s)}%`, base: true };
    if (k === 'critDamage') return { v, text: v ? `×1.5 +${v}` : '×1.5', base: true };
    if (k === 'signal') return { v, text: String(maxSignal(s)), base: true };
    if (k === 'integrity') return { v, text: String(s.server.max), base: true };
    return { v, text: (v ? '+' : '') + fmtStat(k, v) + (STATS[k].cap && v >= STATS[k].cap ? ' (max)' : '') };
  };
  const groups = Object.keys(GROUPS).map((g) => {
    const ks = sideStats(side).filter((k) => STATS[k].group === g);
    if (!ks.length) return '';
    const label = side === 'hacker' && g === 'survival' ? 'Defense · runs' : side === 'server' && g === 'survival' ? 'Defense · home' : GROUPS[g];
    // Every stat, zeros included (dimmed), so you can see what there is to find. Hover a row for what it does.
    const rows = ks.map((k) => [k, total(k)]);
    return `<div class="sheet-group"><h3>${esc(label)}</h3><dl>${rows.map(([k, t]) => `<div class="${t.v || t.base ? '' : 'zero'}" title="${esc(STATS[k].about)}"><dt>${glyph(k)}${esc(STATS[k].name)}</dt><dd>${esc(t.text)}</dd></div>`).join('')}</dl></div>`;
  }).join('');
  return `<div class="sheet">${groups}</div>`;
}

// focus: the stat you want on what you compile (null: any), chosen on the page.
function protocolsParts(s, focus = null) {
  const srv = s.server, lvl = hackerLevel(s), busy = active(s) || !!s.run;
  const cls = ARCHETYPES[classOf(s)].name;
  const n = slotCount(s), on = loaded(s), stash = s.stash || [];
  const slotList = Array.from({ length: PROTOCOL_SLOTS.at(-1).slots }, (_, i) => {
    const kind = SLOTS[SLOT_KINDS[i]]?.name || SLOT_KINDS[i];
    const label = `<span class="inv-slot"><b>${i + 1}</b>${esc(kind)}</span>`;
    if (i >= n) return `<li class="inv-row locked">${label}<span class="inv-empty">opens at Lv ${PROTOCOL_SLOTS.find((x) => x.slots > i).level}</span></li>`;
    const it = rigOf(s)[i] && stashItem(s, rigOf(s)[i]);
    return it
      ? `<li class="inv-row ${rarityClass(it)}">${label}${invBody(it)}<span class="inv-acts"><button type="button" class="inv-btn" data-command="unload ${it.id}" ${busy ? 'disabled' : ''} title="Unload" aria-label="Unload ${esc(it.name)}">×</button></span></li>`
      : `<li class="inv-row empty">${label}<span class="inv-empty">empty</span></li>`;
  }).join('');
  const sort = (a, b) => (loadedOn(s, b.id) === classOf(s)) - (loadedOn(s, a.id) === classOf(s)) || RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.level - a.level;
  // The stash lists what isn't in your slots (loaded items live in the slots above it).
  const spare = stash.filter((it) => loadedOn(s, it.id) !== classOf(s));
  const shown = spare.filter((it) => stashUi.filter === 'all' || groupOf(it) === stashUi.filter);
  const rows = shown.sort(sort).map((it) => {
    const where = loadedOn(s, it.id);
    const whereTag = where ? `<span class="tag dim">on ${esc(ARCHETYPES[where].name)}</span>` : '';
    const dupe = (it.zeroDay && zeroDay(s, it.zeroDay)) || (it.unique && loaded(s).some((x) => x.unique === it.unique));
    const full = !SLOT_KINDS.slice(0, slotCount(s)).includes(groupOf(it)); // a full slot swaps
    const confirm = ['custom', 'zeroday', 'indemnified'].includes(it.rarity) ? ' data-confirm="Sure? Deconstruct"' : '';
    const swap = freeSlot(s, groupOf(it)) < 0 && !full;
    const loadBtn = `<button type="button" class="inv-btn load" data-command="load ${it.id}" data-ptip="${esc(it.id)}" ${busy || full || dupe ? 'disabled' : ''} title="${busy ? 'At home only' : full ? `No ${SLOTS[groupOf(it)]?.name || ''} slot yet` : dupe ? 'You already run this one' : swap ? 'Swap it in for what you run now' : 'Load it into a free slot'}">${swap ? 'Swap' : 'Load'}</button>`;
    const scrap = where ? '' : `<button type="button" class="inv-btn" data-command="deconstruct ${it.id}"${confirm} ${busy ? 'disabled' : ''} title="Deconstruct: salvage, code and Exploits" aria-label="Deconstruct ${esc(it.name)}">${glyph('scrap')}</button>`;
    return `<li class="inv-row ${rarityClass(it)}">${invBody(it, whereTag)}<span class="inv-acts">${loadBtn}${scrap}</span></li>`;
  }).join('');
  const counts = Object.fromEntries(SLOT_KINDS.filter((k, i, a) => a.indexOf(k) === i).map((k) => [k, spare.filter((it) => groupOf(it) === k).length]));
  const filters = `<div class="inv-filters" role="group" aria-label="Show">${[['all', 'All', spare.length], ...Object.entries(counts).map(([k, c]) => [k, SLOTS[k]?.name || k, c])].map(([k, l, c]) => `<button type="button" data-stash-filter="${k}" aria-pressed="${stashUi.filter === k}" ${c || k === 'all' ? '' : 'disabled'}>${esc(l)} <span>${c}</span></button>`).join('')}</div>`;
  const c = compileCost(s), zc = compileCost(s, true);
  const ccost = SALVAGE_COSTS.protocol(c.salvage), zcost = SALVAGE_COSTS.zeroday(zc.salvage);
  const can = (x) => !busy && srv.credits >= x.credits && canAfford(s, x === zc ? zcost : ccost);
  const optLabel = (k) => STATS[k].name + (STATS[k].group === 'survival' ? ' (runs)' : '');
  const opt = (k) => `<option value="${k}" ${focus === k ? 'selected' : ''}>${esc(optLabel(k))}</option>`;
  const mine = knownRecipes(s);
  if (focus && !mine.includes(focus)) focus = null;
  const group = (g, title) => { const ks = mine.filter((k) => STATS[k].group === g); return ks.length ? `<optgroup label="${esc(title)}">${ks.map(opt).join('')}</optgroup>` : ''; };
  const picker = `<label class="fpick"><span>Recipe</span><select data-focus-select>${mine.length > 1 ? '<option value="">Any of mine</option>' : ''}${group('offense', 'Offense')}${group('survival', 'Defense')}${group('utility', 'Utility')}</select></label>`;
  const recipes = (s.recipes || []).filter((z) => ZERO_DAYS[z]).map((z) => `<li><span><b class="iname r-zeroday">${esc(ZERO_DAYS[z].name)}</b><br><small>${esc(ZERO_DAYS[z].effect)} · ${zc.credits}c + ${esc(salvageLabel(zcost))}</small></span><button type="button" class="btn primary small" data-command="compile ${z}" data-pay="zeroday:${zc.salvage}" data-pay-title="${esc(ZERO_DAYS[z].name)}" ${can(zc) ? '' : 'disabled'}>Compile</button></li>`).join('');
  return { slotList, rows, filters, spare, stash, cls, lvl, busy, c, zc, ccost, zcost, can, picker, mine, recipes, focus };
}

// Protocols you run (slots, stats, stash): part of the Loadout page, for the class in use.
export function protocolSlotsCard(s) {
  const p = protocolsParts(s);
  return `<section class="card"><h2>Protocols · ${esc(p.cls)} Lv ${p.lvl}</h2><ul class="inv slots">${p.slotList}</ul>${statSheet(s, 'hacker')}</section>`;
}
export function protocolStashCard(s) {
  const p = protocolsParts(s);
  return `<section class="card stash-card"><h2>Stash · ${p.stash.length}/${STASH_CAP}</h2>${p.spare.length ? `${p.filters}<ul class="inv">${p.rows || '<li class="inv-row empty"><span class="inv-empty">none of these</span></li>'}</ul>` : `<p class="svc-line">${p.stash.length ? 'all loaded' : 'empty'}</p>`}</section>`;
}
export const protocolGearMarkup = (s) => protocolSlotsCard(s) + protocolStashCard(s);
export const protocolsMarkup = (s) => `<div class="page-grid gear-page"><div style="display:grid;gap:12px;align-content:start">${protocolGearMarkup(s)}</div></div>`;

// ---------- crafting: everything you build at home, in one place ----------
// What a recipe takes, as have/need chips: red when you're short. cost: { credits, code: { m: n }, salvage }.
export function needChips(s, cost) {
  const chip = (icon, have, need, name) => `<span class="need ${have >= need ? 'ok' : 'short'}" title="${esc(name)}: you have ${have}, it takes ${need}">${glyph(icon)}<b>${have}</b>/${need}</span>`;
  const mats = materialsOf(s), st = Object.fromEntries(salvageStacks(s).map((x) => [x.name, x.n]));
  const out = [];
  if (cost.credits) out.push(chip('credits', s.server.credits, cost.credits, 'Credits'));
  for (const [m, n] of Object.entries(cost.code || {})) if (n) out.push(chip(m, mats[m] || 0, n, MATERIALS[m].name));
  if (cost.salvage) {
    if (salvageTotal(cost.salvage)) out.push(chip('salvage', s.salvage.length, salvageTotal(cost.salvage), 'Salvage (any)'));
    for (const x of cost.salvage.need) out.push(chip('crate', x.names.reduce((n, k) => n + (st[k] || 0), 0), x.n, x.label));
  }
  return `<span class="needs">${out.join('')}</span>`;
}
// What you have to build with: a grid of counts (Craft and Server pages).
export function matGrid(s) {
  const mats = materialsOf(s);
  const tile = (icon, n, name) => `<li class="mat ${n ? '' : 'zero'}" title="${esc(name)}">${glyph(icon)}<b>${n}</b><small>${esc(name)}</small></li>`;
  return `<ul class="mat-grid">${tile('credits', s.server.credits, 'Credits')}${tile('salvage', s.salvage.length, 'Salvage')}${Object.keys(MATERIALS).map((m) => tile(m, mats[m] || 0, MATERIALS[m].short)).join('')}</ul>`;
}
// A craft section: collapsible, its purpose in one line under the title.
// Which ones you folded stay folded (s.settings.craftShut).
const craftSection = (s, key, title, purpose, body, open = !(s.settings?.craftShut || []).includes(key)) => `<details class="card craft-sec" data-sec="${key}" ${open ? 'open' : ''}><summary><h2 title="${esc(purpose)}">${title}</h2></summary>${body}</details>`;

// The Craft page: categories down the side, the recipes in the one you pick, and the one you pick
// on the right: what comes out, what it takes (have/need), and the button. ui: { cat, pick }.
export function craftCats(s) {
  const p = protocolsParts(s), srv = s.server, busy = p.busy, L = hackerLevel(s);
  const zds = (s.recipes || []).filter((z) => ZERO_DAYS[z]);
  const fc = filterCost(L), fOk = !busy && srv.credits >= fc.credits && (materialsOf(s).cipher || 0) >= fc.code.cipher && canAfford(s, SALVAGE_COSTS.filter()) && filtersOf(s).length < FILTER_CAP;
  const cats = [];
  // Protocols: one recipe per stat you know, or any of them.
  cats.push({ id: 'protocols', name: 'Protocols', icon: 'protocol', items: p.mine.length ? [...(p.mine.length > 1 ? [null] : []), ...p.mine].map((k) => ({
    id: k || 'any', name: k ? PROTOCOL_NAMES[k] : 'Any of your recipes', sub: k ? STATS[k].name : `${p.mine.length} recipes`, icon: k ? 'protocol' : 'item', ready: p.can(p.c),
    out: { title: k ? `${PROTOCOL_NAMES[k]} protocol` : 'A protocol', rarity: 'tuned', level: L, stats: [k ? [k, '', STATS[k].name + (STATS[k].group === 'survival' ? ' (runs)' : ''), STATS[k].about] : ['item', '?', 'one of yours', 'Built around one of your recipes, at random']] },
    cost: { credits: p.c.credits, salvage: p.ccost }, cmd: `compile${k ? ' ' + k : ''}`, pay: `protocol:${p.c.salvage}`, extra: serviceVersion(s, 'buildfarm') ? `<span class="tag you">Build farm −${serviceValue(s, 'buildfarm')}%</span>` : '' })) : [], empty: 'No recipes yet: blueprints teach them.' });
  if (zds.length) cats.push({ id: 'zeroday', name: 'Zero-days', icon: 'source', items: zds.map((z) => ({ id: z, name: ZERO_DAYS[z].name, sub: 'source', icon: 'source', ready: p.can(p.zc), out: { title: ZERO_DAYS[z].name, rarity: 'zeroday', level: L, lines: [ZERO_DAYS[z].effect] }, cost: { credits: p.zc.credits, salvage: p.zcost }, cmd: `compile ${z}`, pay: `zeroday:${p.zc.salvage}` })) });
  // Filters: always craftable; a stat to build around, or any.
  const knownF = filterRecipes(s);
  // Only the recipes you've found: nothing shows until a blueprint teaches it.
  if (knownF.length) cats.push({ id: 'filters', name: 'Filters', icon: 'firewall', items: [...(knownF.length > 1 ? [null] : []), ...CRAFTABLE.filter((k) => knownF.includes(k))].map((k) => ({
    id: k || 'any', name: k ? FILTER_STATS[k].label.replace(/^of /, '') : 'Any of your recipes', sub: k ? `+${FILTER_STATS[k].range.join('–')}${FILTER_STATS[k].name}` : `${knownF.length} recipes`, icon: 'firewall',
    locked: k ? !knownF.includes(k) : !knownF.length, lock: 'Its blueprint drops from viruses', lockTag: 'blueprint', ready: fOk && (k ? knownF.includes(k) : knownF.length > 0),
    out: { title: k ? `${FILTER_STATS[k].kind === 'prefix' ? FILTER_STATS[k].label + ' ' : ''}${filterBase(L)}${FILTER_STATS[k].kind === 'suffix' ? ' ' + FILTER_STATS[k].label : ''}` : `A ${filterBase(L)}`, rarity: 'tuned', level: L, stats: [['firewall', `+${Math.max(1, Math.round((1 + L / 10) * 1.1))}`, 'firewall lv', 'Levels on your firewall while it sits in a slot'], k ? filterStatRow(k) : ['item', '?', 'one of yours', 'Built around one of your recipes, at random']],
      foot: `<span class="tag dim" title="Filters you hold">${glyph('item')}${filtersOf(s).length}/${FILTER_CAP}</span>${filterSlots(s) ? slotPips('firewall', filtersOn(s).length, filterSlots(s), 'Filter slots') : `<span class="tag hot" title="No filter slots yet: install the Filter Bay, or take your firewall to v3">${glyph('firewall')}0 slots</span>`}` },
    cost: { credits: fc.credits, code: fc.code, salvage: SALVAGE_COSTS.filter() }, cmd: `filter craft ${k || 'any'}`, pay: 'filter' })) });
  if (knowsPlan(s, 'relay')) cats.push({ id: 'relays', name: 'Relays', icon: 'relay', items: [{ id: 'relay', name: 'Relay', sub: `${kitOf(s).relay || 0} in your kit`, icon: 'relay', ready: !busy && canBuildRelay(s),
    out: { title: 'Relay', tags: [['relay', `${kitOf(s).relay || 0} in your kit`, 'Relays you have, ready to install']], lines: ['Install it on a server you’ve taken over. It pings the unknown servers next to it and flags a contract’s signal.'] }, cost: relayCost(s), cmd: 'outpost build relay', pay: 'relay' }] });
  return cats;
}
// What comes out: rarity and level as chips, stats as icon rows, then any rule text and a footer.
const filterStatRow = (k) => { const x = FILTER_STATS[k], [a, b] = x.range; return x.family ? [{ ransomware: 'cipher', ghostroot: 'kernel' }[k] || k, `+${a}–${b}`, x.name.replace(/^ lv /, 'lv '), `More levels against ${x.name.replace(/^ lv vs /, '')} invaders only`] : [{ frag: 'scrap', defrag: 'repair', grind: 'damage', chip: 'shield', tarpit: 'tarpit', sting: 'spike' }[k] || 'item', `${a}–${b}%`, x.name.replace(/^% /, ''), '']; };
function outBody(o) {
  const tags = [o.rarity && `<span class="tag cd-rar r-${o.rarity}">${esc(RARITIES[o.rarity]?.name || o.rarity)}</span>`, o.level && `<span class="tag dim" title="Item level">Lv ${o.level}</span>`, ...(o.tags || []).map(([ic, txt, tip]) => `<span class="tag dim" title="${esc(tip || '')}">${glyph(ic)}${esc(txt)}</span>`)].filter(Boolean).join('');
  const stats = (o.stats || []).map(([ic, v, name, tip]) => `<li title="${esc(tip || '')}">${glyph(ic)}${v ? `<b>${esc(v)}</b>` : ''}<span>${esc(name)}</span></li>`).join('');
  return `<div class="cd-meta">${tags ? `<div class="cd-tags">${tags}</div>` : ''}${stats ? `<ul class="cd-stats">${stats}</ul>` : ''}${(o.lines || []).length ? `<ul class="cd-lines">${o.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${o.foot ? `<div class="cd-foot">${o.foot}</div>` : ''}</div>`;
}
// What a recipe takes, a row each: the icon, the name, what you have / what it takes (red when short).
function costRows(s, cost, cls = '') {
  const mats = materialsOf(s), st = Object.fromEntries(salvageStacks(s).map((x) => [x.name, x.n])), rows = [];
  const row = (icon, name, have, need) => rows.push(`<li class="${have >= need ? 'ok' : 'short'}">${glyph(icon)}<span>${esc(name)}</span><b>${have}<small>/${need}</small></b></li>`);
  if (cost.credits) row('credits', 'Credits', s.server.credits, cost.credits);
  for (const [m, n] of Object.entries(cost.code || {})) if (n) row(m, MATERIALS[m].name, mats[m] || 0, n);
  if (cost.salvage) {
    if (salvageTotal(cost.salvage)) row('salvage', 'Salvage (any)', s.salvage.length, salvageTotal(cost.salvage));
    for (const x of cost.salvage.need) row('crate', x.label, x.names.reduce((n, k) => n + (st[k] || 0), 0), x.n);
  }
  if (cost.level > 1) row('server', 'Server level', serverLevel(s), cost.level);
  return `<ul class="cd-cost${cls ? ' ' + cls : ''}">${rows.join('')}</ul>`;
}
export function craftMarkup(s, ui = {}) {
  const cats = craftCats(s), busy = active(s) || !!s.run;
  const why = s.run ? 'Craft at home: jack out first' : active(s) ? 'Finish the fight first' : '';
  const cat = cats.find((c) => c.id === ui.cat) || cats[0];
  const item = cat.items.find((x) => x.id === ui.pick) || cat.items.find((x) => x.ready) || cat.items.find((x) => !x.locked) || cat.items[0];
  const nav = `<nav class="craft-cats" aria-label="What to craft">${cats.map((c) => { const n = c.items.filter((x) => x.ready).length; return `<button type="button" class="craft-cat${c === cat ? ' on' : ''}" data-craft-cat="${c.id}" aria-pressed="${c === cat}">${glyph(c.icon)}<span>${esc(c.name)}</span>${n ? `<b class="cc-n" title="${n} you can craft now">${n}</b>` : ''}</button>`; }).join('')}</nav>`;
  const list = `<ul class="craft-items">${cat.items.length ? cat.items.map((x) => `<li><button type="button" class="craft-item${x === item ? ' on' : ''}${x.locked ? ' locked' : ''}${x.ready ? ' ready' : ''}" data-craft-pick="${esc(x.id)}">${glyph(x.icon)}<span class="ci-txt"><b>${esc(x.name)}</b><small>${esc(x.sub || '')}</small></span>${x.locked ? `<span class="tag dim plan-lock" title="${esc(x.lock || '')}">${glyph('blueprint')}${x.lockTag || 'plan'}</span>` : x.done ? '<span class="tag you">owned</span>' : x.ready ? '<i class="ci-dot" title="You can craft it"></i>' : ''}</button></li>`).join('') : `<li class="craft-empty">${esc(cat.empty || 'Nothing here yet.')}</li>`}</ul>`;
  const detail = !item ? `<section class="craft-detail card"><p class="quiet">${esc(cat.empty || '')}</p></section>`
    : `<section class="craft-detail card"><h2>${esc(cat.name)}</h2><div class="cd-out${item.out.rarity ? ' r-' + item.out.rarity : ''}">${glyph(item.icon, 'badge')}<h1 class="cd-name${item.out.rarity ? ' r-' + item.out.rarity : ''}">${esc(item.out.title)}</h1>${outBody(item.out)}</div>
      ${item.locked ? `<p class="cd-lock"><span class="tag dim plan-lock">${glyph('blueprint')}${item.lockTag || 'plan'}</span> ${esc(item.lock || '')}</p>` : item.done ? '<p class="cd-lock"><span class="tag you">owned</span></p>' : `<h3 class="craft-sub">Takes</h3>${costRows(s, item.cost)}${item.extra || ''}
      <button type="button" class="btn primary cd-go" data-command="${esc(item.cmd)}"${item.pay ? ` data-pay="${esc(item.pay)}" data-pay-title="${esc(item.out.title)}"` : ''} ${item.ready ? '' : 'disabled'} ${why ? `title="${esc(why)}"` : item.ready ? '' : 'title="Not enough of something above"'}>Craft</button>`}</section>`;
  return `<div class="craft-ui${busy ? ' busy' : ''}">${nav}${list}${detail}</div>`;
}
export const vaultMarkup = protocolsMarkup;
export const gearMarkup = protocolsMarkup;

// ---------- the server (services) ----------
export const fmtTime = (ms) => (ms >= 3600000 ? `${Math.floor(Math.ceil(ms / 60000) / 60)}h ${Math.ceil(ms / 60000) % 60}m` : ms >= 60000 ? `${Math.ceil(ms / 60000)} min` : `${Math.max(0, Math.ceil(ms / 1000))}s`);
// What a version of a service does, in plain words, at your server's level.
export function serviceEffect(s, id, v) {
  const d = SERVICES[id], x = d.values[v - 1], val = serviceValue(s, id, v);
  switch (d.stat) {
    case 'integrity': return `+${val} max Integrity (${x}%)`;
    case 'shield': return `home fights start with a ${val} shield (${x}% of max)`;
    case 'regen': return `+${val} Regen`;
    case 'countermeasures': return `whatever hits your server takes ${val}`;
    case 'cron': return `every 3rd cycle, hits the soonest attacker for ${Math.round(8 * power(serverLevel(s)) * x)}`;
    case 'snapshot': return `once per home fight, below half: restores ${x}%`;
    case 'compileDiscount': return `compiling costs ${x}% less`;
    case 'firewall': return `${x} filter ${x === 1 ? 'slot' : 'slots'} on your firewall`;
    case 'tarpit': return `invasions travel ${x}% slower`;
    case 'bandwidth': return `+${x} harvester ${x === 1 ? 'slot' : 'slots'}`;
    case 'scheduler': return `collects every outpost each ${x} minutes`;
    default: return `+${x}% ${STATS[d.stat].name}`;
  }
}
// ---------- the wall (invasions) ----------
export function bandsText(s) {
  if (s.degraded) return 'Your wall is down while the server is degraded.';
  const { blocks, holds } = wallBands(s);
  if (!holds) return 'Your wall holds nothing yet: every invasion breaches.';
  const held = holds > blocks ? ` and holds ${blocks ? `level ${blocks + 1}–${holds}` : `up to level ${holds}`} contested` : '';
  return `Your wall ${blocks ? `blocks invasions up to level ${blocks}` : 'blocks none outright'}${held}; above level ${holds}, they breach.`;
}
export function degradedMarkup(s, now = Date.now()) {
  return s.degraded ? `<div class="degraded" title="Wall down · installs paused · no server XP"><b>DEGRADED</b><span>${fmtLeft(degradedLeft(s, now))}</span></div>` : '';
}
// "≤12 · contested ≤22": what your wall stops outright, and what it holds.
export function wallShort(s) {
  if (s.degraded) return 'down';
  const { blocks, holds } = wallBands(s);
  return !holds ? 'none' : `${blocks ? `Lv ≤${blocks}` : '—'} · contested ≤${holds}`;
}
export function invaderShort(s) {
  const inv = s.invasion;
  if (!inv) return '';
  if (s.degraded && inv.state !== 'travel') return 'waiting';
  const r = ratioOf(s, inv), pct1 = (x) => `${Math.round(x * 10) / 10}%`;
  if (inv.state === 'travel') return `${fmtLeft(inv.left)} out`;
  return inv.state === 'siege' ? `contested · ${Math.round(inv.hp * 100)}% · −${pct1(chipRate(r))}/min` : `breach · −${pct1(chipRate(r))}/min`;
}
// One line on what the invader is doing, and whether jacking in is possible.
export function invaderStatus(s) {
  const inv = s.invasion;
  if (!inv) return null;
  const r = ratioOf(s, inv);
  const hp = Math.round(inv.hp * 100);
  const pct1 = (x) => `${Math.round(x * 10) / 10}%`;
  if (s.degraded && inv.state !== 'travel') return { text: `${inv.name} waits at the gate while your server is degraded.`, can: false, why: 'Your server is degraded' };
  if (inv.state === 'travel') {
    const verdict = { blocked: 'your wall will stop it', siege: 'your wall will contest it', breach: "your wall won't hold it: a breach" }[outcome(r)];
    return { text: `${inv.name} reaches your wall in about ${fmtLeft(inv.left)}; ${verdict}.`, can: false, why: 'Still on its way' };
  }
  const why = fighting(s, inv) ? 'You are fighting it' : s.run ? 'Jack out of your run first' : active(s) ? 'Finish this fight first' : '';
  if (inv.state === 'siege') return { text: `Contested: your wall wears ${inv.name} down (${pct1(grindRate(r))} a minute, ${hp}% left) while it chips ${pct1(chipRate(r))} of your Integrity a minute. Jack in to finish it for a full kill.`, can: !why, why, hp };
  return { text: `Breach: ${inv.name} chips ${pct1(chipRate(r))} of your Integrity a minute until you jack in and fight it.`, can: !why, why, hp };
}
function jackInButton(st) {
  return `<button type="button" class="btn ${st.can ? 'primary' : ''}" data-command="jack in" ${st.can ? '' : 'disabled'} title="${esc(st.can ? 'Fight it at the wall: worn down, armor intact, a full kill' : st.why)}">Jack in</button>`;
}
// Finish a timed build now (credit buyout): the price on the button, off if you can't pay.
export const buyoutBtn = (s, cmd, price) => (price ? `<button type="button" class="btn small buyout" data-command="${esc(cmd)}" ${s.server.credits < price ? 'disabled' : ''} title="Finish it now. The price drops as the time runs down.">${glyph('credits')}Finish now · ${price}</button>` : '');
// Slots as pips: filled for used, hollow for free, with an icon and the name on hover.
export function slotPips(icon, used, total, name) {
  return `<span class="slots" title="${esc(name)}: ${used} of ${total} in use">${glyph(icon)}${Array.from({ length: total }, (_, i) => `<i class="${i < used ? 'on' : ''}"></i>`).join('')}<small>${used}/${total}</small></span>`;
}
// The wall as a level ruler: blocked (teal), held at a siege (amber), breaks through (red),
// with your server's level and an incoming invader marked on it. Each level is a cell; marks and
// scale numbers sit on the middle of theirs, and a number a mark already shows isn't repeated.
export function wallRuler(s, compact = false, bands = wallBands(s)) {
  // Shown once something has come for your wall (FFXIV/WoW: UI as it starts to matter).
  if (!s.invasion && !Object.keys(s.net?.seen || {}).length) return compact ? '' : '<div class="wall-ruler quiet" title="Nothing has come for your wall yet"><span>no invasions yet</span></div>';
  if (s.degraded) return '<div class="wall-ruler down" title="Your wall is down while the server is degraded"><span>wall down</span></div>';
  const { blocks, holds } = bands, you = threatTop(s), inv = s.invasion; // the mark: the highest level your attached servers send
  const hi = Math.max(holds + 4, you + 4, (inv?.level || 0) + 2, 8), pct = (lv) => `${Math.min(100, (lv / hi) * 100)}%`;
  const seg = (cls, from, to, icon, tip) => (to > from ? `<span class="wr-seg ${cls}" style="left:${pct(from)};width:calc(${pct(to)} - ${pct(from)})" title="${esc(tip)}">${compact ? '' : glyph(icon)}</span>` : '');
  const mark = (lv, cls, label) => `<span class="wr-mark ${cls}" style="left:${pct(lv - 0.5)}" title="${esc(label)}"><i></i><small>${esc(label)}</small></span>`;
  return `<div class="wall-ruler${compact ? ' compact' : ''}" title="${esc(bandsText(s))}">
    <div class="wr-track">${seg('blocked', 0, blocks, 'firewall', blocks ? `Stopped at the wall: up to level ${blocks}` : '')}${seg('siege', blocks, holds, 'tarpit', `Contested: level ${blocks + 1}–${holds}`)}${seg('breach', holds, hi, 'kill', `Breaks through: level ${holds + 1} and up`)}</div>
    <div class="wr-marks">${you ? mark(you, 'you', `servers ${you}`) : ''}${inv ? mark(inv.level, 'inv ' + inv.state, `${inv.name} ${inv.level}`) : ''}</div>
    ${compact ? '' : `<div class="wr-scale">${[...new Set([1, blocks, holds, hi])].filter((lv) => lv >= 1 && Math.abs(lv - you) > 1 && (!inv || Math.abs(lv - inv.level) > 1)).map((lv) => `<span style="left:${pct(lv - 0.5)}">${lv}</span>`).join('')}</div>`}
  </div>`;
}
// The highest level any server attached to your network sends: what your firewall is up against.
export const threatTop = (s) => Math.max(0, ...(s.locations || []).filter((l) => !l.rogue && isLive(s, l)).map((l) => l.level || 1));
// "Vulnerable to lv 9+" (amber if it would be contested, red if it would break through), or teal
// "Not vulnerable" when nothing attached gets past it.
export function vulnLine(s, b = wallBands(s)) {
  const top = threatTop(s);
  if (s.degraded) return '<span class="vuln low">Wall down</span>';
  if (b.blocks >= top) return `<span class="vuln ok" title="${top ? `Your servers send up to level ${top}` : 'Nothing attached sends invasions'}">Safe</span>`;
  return `<span class="vuln ${b.holds >= top ? 'mid' : 'low'}" title="Blocks up to level ${b.blocks}; contests up to ${b.holds}. Your servers send up to level ${top}.">Vulnerable to lv ${b.blocks + 1}+</span>`;
}
// The firewall's blocks: solid when whole, scattered and dim when fragmented (a fixed scatter, so
// the same blocks go first), sweeping while it defragments, shielded while hardened.
const SCATTER = [5, 12, 2, 9, 14, 0, 7, 11, 3, 15, 6, 1, 10, 4, 13, 8];
export function fwGrid(s, now = Date.now()) {
  const f = fwOf(s), bad = new Set(SCATTER.slice(0, Math.floor(f.frag)));
  const tip = `${Math.floor(f.frag)}/${FIREWALL.blocks} fragmented · −${fragLevels(s)} ${fragLevels(s) === 1 ? 'level' : 'levels'}${defragging(s, now) ? ' · defragmenting' : ''}${hardenLeft(s, now) ? ` · hardened ${fmtTime(hardenLeft(s, now))}` : ''}`;
  return `<div class="fw-grid${defragging(s, now) ? ' defrag' : ''}${hardenLeft(s, now) ? ' hard' : ''}" title="${esc(tip)}">${Array.from({ length: FIREWALL.blocks }, (_, i) => `<i class="${bad.has(i) ? 'frag' : ''}"></i>`).join('')}</div>`;
}
const filterStatSum = (s) => filtersOn(s).reduce((a, x) => a + (x.stats.strength || 0), 0);
// A holding's firewall in one compact block (an outpost, a hub you hold): its level, the line on
// what it's vulnerable to against what comes for it (top: the highest level that does), its blocks,
// and Upgrade, Defrag and harden.sh. arg: what the firewall commands take for it.
function fwRow(s, holder, arg, top, now = Date.now()) {
  const f = fwAt(s, holder), b = wallBands(s, ratingAt(s, holder, null, now)), c = upgradeCost(f.level), busy = active(s) || !!s.run;
  const can = canPay(s, c);
  const state = b.blocks >= top ? 'ok' : b.holds >= top ? 'mid' : 'low', frag = fragLevels(s, holder), def = defragging(s, now, holder), hard = hardenLeft(s, now, holder);
  const line = state === 'ok' ? `<span class="vuln ok" title="Up to level ${top} comes for it">Safe</span>` : `<span class="vuln ${state}" title="Blocks up to level ${b.blocks}; contests up to ${b.holds}. Up to level ${top} comes for it.">Vulnerable to lv ${b.blocks + 1}+</span>`;
  const bad = new Set(SCATTER.slice(0, Math.floor(f.frag)));
  return `<div class="fw-mini"><div class="fw-head"><span class="fw-tag">${glyph('firewall')}<b>lv ${effLevel(s, now, null, holder)}</b></span>${fwVersion(f)}${frag || def ? `<span class="tag warn">−${frag + (def ? FIREWALL.defragLoss : 0)}</span>` : ''}${hard ? `<span class="tag you">+${FIREWALL.harden.plus} · ${fmtTime(hard)}</span>` : ''}${line}</div>
    ${fwActs(s, f, arg, can, c, busy, def, now)}</div>`;
}
// Open ports: a switch under the firewall's ruler. On, invasions come faster and pay more while you
// play (invasion.mjs); they close when you log off.
function portsRow(s) {
  if (!threatTop(s)) return '';
  const open = !!s.net?.open;
  return `<button type="button" class="ports-row${open ? ' on' : ''}" role="switch" aria-checked="${open}" data-command="${open ? 'close ports' : 'open ports'}" title="${open ? 'On while you play; closes when you log off' : 'Off'}"><span class="sw"><i></i></span><b>Open ports</b><span class="pr-chips"><span class="tag${open ? ' hot' : ' dim'}">Invasions ×2.5</span><span class="tag${open ? ' you' : ' dim'}">Rewards +50%</span></span></button>`;
}
// Its major version (every 10 levels): the tag, its perks on hover, the next one ahead.
function fwVersion(f) {
  const v = versionOf(f.level), got = perksAt(f.level), next = VERSION_PERKS.find((p) => p.v > v);
  const tip = [...got.map((p) => `v${p.v}: ${p.name}`), next ? `Next, v${next.v} at lv ${(next.v - 1) * VERSION_EVERY}: ${next.name}` : ''].filter(Boolean).join(' · ');
  return `<span class="tag fw-ver" title="${esc(tip || `Next, v2 at lv ${VERSION_EVERY}`)}">v${v}</span>`;
}
// A button's price, after its label: an icon and a number for each thing it takes.
const bcost = (c) => `<span class="bcost">${Object.entries(c).filter(([, n]) => n).map(([k, n]) => `<span title="${esc(k === 'credits' ? 'Credits' : MATERIALS[k]?.name || k)}">${glyph(k)}${n}</span>`).join('')}</span>`;
// The firewall's buttons, each only once it means something: Upgrade when you can pay for the next
// level, Defrag when it's fragmented (or running), harden.sh when you hold one.
function fwActs(s, f, arg, can, c, busy, def, now, extra = '') {
  const cmd = (v) => `firewall ${v}${arg ? ' ' + esc(arg) : ''}`, n = kitOf(s).harden || 0;
  const nv = c.major ? VERSION_PERKS.find((p) => p.v === versionOf(f.level + 1)) : null;
  const up = can ? `<button type="button" class="btn small primary fw-up${c.major ? ' major' : ''}" data-command="${cmd('upgrade')}" ${busy ? 'disabled' : ''} title="${c.major ? `A new version${nv ? `: ${esc(nv.name)}` : ''}` : 'Blocks one level more'}">${c.major ? `Upgrade to v${versionOf(f.level + 1)}` : `Upgrade to lv ${f.level + 1}`}${bcost({ credits: c.credits, cipher: c.cipher, worm: c.worm, kernel: c.kernel, exploit: c.exploit })}</button>` : '';
  const dc = defragCost(f);
  const dfr = f.frag || def ? `<button type="button" class="btn small fw-up" data-command="${cmd('defrag')}" ${def || busy || (!def && s.server.credits < dc) ? 'disabled' : ''} title="${FIREWALL.defragLoss} levels down while it runs">${def ? `Defragmenting · ${fmtLeft(f.defragUntil - now)}` : `Defrag${bcost({ credits: dc })}`}</button>` : '';
  const hd = n ? `<button type="button" class="btn small" data-command="${cmd('harden')}" ${busy ? 'disabled' : ''} title="+${FIREWALL.harden.plus} levels for ${FIREWALL.harden.ms / 3600000} hours">harden.sh × ${n}</button>` : '';
  const all = up + dfr + hd + extra;
  return all ? `<div class="row fw-acts">${all}</div>` : '';
}
function firewallPanel(s, now) {
  const f = fwOf(s), c = upgradeCost(f.level), eff = effLevel(s, now), busy = active(s);
  const can = canPay(s, c);
  const mods = [fragLevels(s) ? `<span class="tag warn" title="Fragmented">−${fragLevels(s) + (defragging(s, now) ? FIREWALL.defragLoss : 0)}</span>` : defragging(s, now) ? `<span class="tag warn" title="Defragmenting">−${FIREWALL.defragLoss}</span>` : '', hardenLeft(s, now) ? `<span class="tag you" title="harden.sh · ${fmtTime(hardenLeft(s, now))} left">+${FIREWALL.harden.plus} · ${fmtTime(hardenLeft(s, now))}</span>` : ''].join('');
  return `<div class="fw-panel"><div class="fw-head"><b class="fw-lv" title="Blocks invasions up to this level · base level ${f.level}">lv ${eff}</b>${fwVersion(f)}${filterStatSum(s) ? `<span class="tag you" title="Filters">+${filterStatSum(s)}</span>` : ''}${wallBonus(s) ? `<span class="tag ${wallBonus(s) > 0 ? 'you' : 'warn'}" title="${esc([archWall(s) && `Architecture ${archWall(s) > 0 ? '+' : ''}${archWall(s)}`, consortiumWall(s) && `Consortium +${consortiumWall(s)}`].filter(Boolean).join(' · '))}">${wallBonus(s) > 0 ? '+' : ''}${wallBonus(s)}</span>` : ''}${mods}${vulnLine(s)}</div>${fwGrid(s, now)}
    ${fwActs(s, f, '', can, c, busy, defragging(s, now), now)}</div>`;
}
// A contract's pay as icon chips: credits, Indemnity, XP, standing and rep, anything extra.
function rewardChips(s, c) {
  const r = c.reward, chip = (ic, v, tip, cls = '') => `<span class="rw ${cls}" title="${esc(tip)}">${glyph(ic)}<b>${esc(String(v))}</b></span>`;
  return [r.credits && chip('credits', r.credits, 'Credits'), r.indemnity && chip('indemnity', r.indemnity, 'Indemnity: Halcyon scrip'),
    r.xp && chip('xp', xpFor(s, hackerLevel(s), r.xp), 'XP'),
    r.standing && chip('f-halcyon', `${r.standing > 0 ? '+' : ''}${r.standing}`, 'Halcyon standing', r.standing < 0 ? 'neg' : ''),
    c.offBooks && chip('f-glassjaw', '+5', 'GLASSJAW rep'), r.rep && c.faction && chip('f-' + c.faction, `+${r.rep}`, `${FACTIONS[c.faction].short} rep`),
    r.relay && chip('relay', `×${r.relay}`, 'A relay'), r.blueprint && chip('blueprint', '+1', 'A blueprint'), r.daemon && chip('daemon', '+1', 'A daemon'), r.item && chip('item', '+1', 'A protocol')].filter(Boolean).join('');
}
// A filter's stats as chips (an icon and a number each); dim while it isn't in a slot.
const FILTER_ICON = { strength: 'firewall', worm: 'worm', ransomware: 'cipher', ghostroot: 'kernel', frag: 'scrap', defrag: 'repair', grind: 'damage', chip: 'shield', tarpit: 'tarpit', sting: 'spike', evasion: 'evasion', sanitize: 'sanitize', reflect: 'honeypot' };
function filterChips(s, f, on) {
  const lv = fwOf(s).level;
  return Object.entries(f.stats).map(([k, v]) => {
    const x = FILTER_STATS[k], fam = x?.family;
    const label = k === 'strength' ? `+${v} lv` : fam ? `+${v} lv` : `${v}%`, what = k === 'strength' ? 'firewall levels' : x.name.replace(/^ lv /, 'levels ').replace(/^% /, '');
    const tip = k === 'strength' ? `+${v} firewall levels${on ? '' : `: lv ${lv} → ${lv + v} with it in`}` : `${v}${x.name}${fam ? '' : ''}`;
    return `<span class="fchip" title="${esc(tip)}">${glyph(FILTER_ICON[k] || 'item')}<b>${esc(label)}</b><small>${esc(k === 'strength' ? '' : what)}</small></span>`;
  }).join('');
}
// How to trace an unknown server: each way, what it adds, and whether it's open to you yet.
const FAM_GLYPH = { worm: 'worm', ransomware: 'cipher', ghostroot: 'kernel' };
function traceWays(s, h, via, kit) {
  const relay = !!h.pinged, known = relay || !!h.seen, route = `ping-${h.id}.trc`, banked = !!via?.state?.taken?.['/' + route];
  const row = (ic, label, gain, state, tip) => `<li class="tw ${state}" title="${esc(tip)}">${glyph(ic)}<span>${esc(label)}</span><b>${esc(gain)}</b></li>`;
  const needRelay = `Needs a relay on ${via?.name || 'the server next to it'}`;
  return `<ul class="trace-ways">
    ${row('spike', 'Beat its invader', `+${HIDDEN.winLead}%`, 'on', `When it sends an invasion, jack in and win: +${HIDDEN.winLead}%. Your wall stopping it: +${HIDDEN.blockLead}%.`)}
    ${row(known ? FAM_GLYPH[h.family] || 'kill' : 'kill', known ? `Kill ${FAMILIES[h.family]?.name || '?'}` : 'Kill ?', `+${HIDDEN.killLead}%`, relay ? 'on' : 'off', relay ? `Every ${FAMILIES[h.family]?.name || ''} you kill, at home or in SPRAWL-00` : `${needRelay} for kills to count${known ? '' : ' (it also reads the family; so does an invader from it)'}`)}
    ${row('relay', route, `+${HIDDEN.routeLead}%`, banked ? 'done' : relay ? 'on' : 'off', banked ? 'Banked' : relay ? `In / on ${via?.name || '?'}: pull it and bank it` : needRelay)}
    ${row('injector', 'Trace injector', '+30%', kit.injector ? 'on' : 'off', kit.injector ? 'Use it below' : 'Halcyon’s store, Kestrel and LANTERN sell them')}
  </ul>`;
}
// The firewall's filters: its slots (from the Filter Bay service), then what you hold. Equip and
// scrap at home; each one's stats on one line, its rarity in its colour.
function filterPanel(s) {
  const held = filtersOf(s), on = (s.filters?.on || []), n = filterSlots(s), busy = active(s) || !!s.run;
  if (!n && !held.length) return '';
  const tile = (f, i) => `<li class="flt${on.includes(i) ? ' on' : ' off'}" data-ptip="f:${i}"><b class="iname r-${f.rarity}">${esc(f.name)}</b><span class="fchips">${filterChips(s, f, on.includes(i))}</span>${on.includes(i) ? `<button type="button" class="btn small" data-command="filter unequip ${i + 1}" ${busy ? 'disabled' : ''}>Out</button>` : `${n ? `<button type="button" class="btn small ${on.length < n ? 'primary' : ''}" data-command="filter equip ${i + 1}" ${busy || on.length >= n ? 'disabled' : ''} title="${on.length >= n ? 'Every slot is full' : 'Put it in'}">In</button>` : ''}<button type="button" class="btn small ghost" data-command="filter scrap ${i + 1}" ${busy ? 'disabled' : ''} title="For salvage">×</button>`}</li>`;
  const slots = Array.from({ length: n }, (_, k) => { const i = on[k]; return i != null && held[i] ? '' : '<li class="flt empty"><small>empty slot</small></li>'; }).join('');
  const rows = held.map(tile);
  return `<div class="flt-panel"><h3 class="craft-sub flt-head">Filters ${n ? slotPips('firewall', on.filter((i) => held[i]).length, n, 'Filter slots') : `<span class="tag hot" title="No filter slots: install the Filter Bay (Server page), or take your firewall to v3">${glyph('firewall')}no slot</span>`}<span class="tag dim" title="Filters you hold">${glyph('item')}${held.length}/${FILTER_CAP}</span></h3><ul class="flt-list">${on.filter((i) => held[i]).map((i) => rows[i]).join('')}${slots}${held.map((f, i) => (on.includes(i) ? '' : rows[i])).join('')}</ul></div>`;
}
// The invasion's own card on the map: the virus, where it's from, what it's doing (with a timer
// bar), one line on how your firewall meets it, and Jack in once it's at your wall.
function invaderCard(s) {
  const inv = s.invasion;
  if (!inv) return '';
  const st = invaderStatus(s), o = outcome(ratioOf(s, inv)), lv = effLevel(s, undefined, inv.family);
  const verdict = { blocked: ['you', 'blocks it'], siege: ['warn', 'contests it'], breach: ['hot', 'won\'t hold it'] }[o];
  const pct = inv.state === 'travel' ? (1 - inv.left / Math.max(1, inv.total)) * 100 : inv.hp * 100;
  const tags = `${levelTag(s, inv.level)}${inv.mutation ? `<span class="tag tag-mut" title="${esc(MUTATIONS[inv.mutation].rule)}">${esc(MUTATIONS[inv.mutation].name)}</span>` : ''}${inv.strain && STRAINS[inv.strain] ? `<span class="tag tag-strain" title="${esc(STRAINS[inv.strain].rule || '')}">${esc(STRAINS[inv.strain].name)}</span>` : ''}`;
  return `<section class="card inv-card ${inv.state}"><h2>Invasion</h2><h1>${esc(inv.name)}</h1><p class="svc-line">${tags}</p><p class="svc-line quiet">from ${esc(inv.fromName)}</p>
    <div class="inv-state"><span class="tag ${inv.state === 'breach' ? 'hot' : inv.state === 'siege' ? 'warn' : ''}">${esc(inv.state === 'travel' ? 'on its way' : inv.state === 'siege' ? 'contested' : 'breach')}</span><b>${esc(invaderShort(s))}</b></div>
    <div class="wall-bar ${inv.state}"><span style="width:${Math.max(0, Math.min(100, Math.round(pct)))}%"></span></div>
    <p class="svc-line">${glyph('firewall')} Your firewall <b>lv ${lv}</b> <span class="tag ${verdict[0]}">${verdict[1]}</span></p>
    <div class="row">${inv.state !== 'travel' && st ? jackInButton(st) : ''}<button type="button" class="btn" data-go="server">Firewall</button></div></section>`;
}
export function wallMarkup(s, now = Date.now()) {
  const inv = s.invasion, st = invaderStatus(s);
  const bar = st && inv.state !== 'travel' ? `<div class="wall-bar ${inv.state}"><span style="width:${Math.max(0, Math.min(100, Math.round(inv.hp * 100)))}%"></span></div>` : '';
  const bands = wallRuler(s);
  const body = inv
    ? `<div class="invader ${inv.state}"><div class="gitem-head"><b>${esc(inv.name)}</b>${levelTag(s, inv.level)}${inv.mutation ? `<span class="tag tag-mut" data-mut="${inv.mutation}" title="${esc(MUTATIONS[inv.mutation].rule)}">${esc(MUTATIONS[inv.mutation].name)}</span>` : ''}<span class="tag ${inv.state === 'breach' ? 'hot' : ''}">${esc(invaderShort(s))}</span></div><small>${esc(inv.fromName)}</small>${bar}${inv.state !== 'travel' ? `<div class="row">${jackInButton(st)}</div>` : ''}</div>`
    : '';
  return `<section class="card wall-card"><h2>Firewall</h2>${degradedMarkup(s, now)}${firewallPanel(s, now)}${bands}${portsRow(s)}${body}${filterPanel(s)}</section>`;
}

// Server architecture: picked at server level 20, a trade each way.
function archMarkup(s) {
  const lvl = serverLevel(s), cur = archOf(s), busy = active(s);
  if (lvl < ARCH_LEVEL - 5) return ''; // hidden until it's in sight
  if (lvl < ARCH_LEVEL) return `<section class="card arch-card locked"><h2>Architecture</h2><p class="svc-line"><span class="tag dim" title="Opens at server level ${ARCH_LEVEL}">server lv ${ARCH_LEVEL}</span></p></section>`;
  const opts = Object.entries(ARCHITECTURES).map(([id, a]) => `<li class="${cur === id ? 'on' : ''}"><span><b class="iname" title="${esc(a.rule)}">${glyph({ fortress: 'firewall', hub: 'router', lab: 'buildfarm' }[id], 'badge')}${esc(a.name)}</b></span>${cur === id ? '<span class="tag you">running</span>' : `<button type="button" class="btn ${cur ? '' : 'primary'} small" data-command="architecture ${id}" ${busy || (cur && s.server.credits < ARCH_SWITCH) ? 'disabled' : ''} title="${cur ? `Rebuild as a ${esc(a.name)}: ${ARCH_SWITCH} credits` : 'Build around this'}">${cur ? `Switch (${ARCH_SWITCH}c)` : 'Choose'}</button>`}</li>`).join('');
  return `<section class="card arch-card"><h2>Architecture${cur ? ` · ${esc(ARCHITECTURES[cur].name)}` : ''}</h2><ul class="craft-list">${opts}</ul></section>`;
}
export function serverMarkup(s, now = Date.now()) {
  const srv = s.server, m = materialsOf(s), busy = active(s);
  const used = portsUsed(s), total = portCount(s);
  const mats = Object.keys(MATERIALS).map((k) => `<div class="stat"><span>${glyph(k)}${esc(MATERIALS[k].name)}</span><strong>${m[k] || 0}</strong></div>`).join('') + `<div class="stat" title="Any salvage: deconstruct items for more."><span>Salvage</span><strong>${s.salvage.length}</strong></div>`;
  const job = s.install;
  const queue = job
    ? `<div class="install"><div class="install-top"><b>${esc(SERVICES[job.id].name)} v${job.v}</b><span>${fmtTime(job.doneAt - now)} left</span></div><div class="install-bar"><span style="width:${Math.min(100, Math.max(0, ((now - job.startedAt) / (job.doneAt - job.startedAt)) * 100))}%"></span></div>
       <div class="row">${buyoutBtn(s, 'buyout', installBuyout(s, now))}${btn('cancel install', 'Cancel (full refund)')}</div></div>`
    : '<p class="svc-line">idle</p>';
  const next = (id) => {
    const v = serviceVersion(s, id) + 1;
    if (v > VERSIONS.length) return '<small>max</small>';
    const why = installBlock(s, id);
    const x = VERSIONS[v - 1], { credits, ...code } = serviceCost(id, v);
    return `<small>v${v}: ${esc(serviceEffect(s, id, v))}</small>${costRows(s, { credits, code, salvage: SALVAGE_COSTS.service(x.salvage), level: x.needs }, 'tight')}
      <button type="button" class="btn ${why ? '' : 'primary'} small" data-command="install ${id}" ${why || busy ? 'disabled' : ''} title="${esc(why || (v > 1 ? 'Upgrade' : 'Install'))}">${v > 1 ? `Upgrade to v${v}` : 'Install'} · ${x.minutes} min</button>`;
  };
  const running = Object.keys(s.services || {}).map((id) => `<li class="svc on"><div class="svc-main"><div class="gitem-head"><b class="svc-name">${glyph(id, 'badge')}${esc(SERVICES[id].name)}</b><span class="tag you">v${serviceVersion(s, id)}</span></div>
      <small>${esc(serviceEffect(s, id, serviceVersion(s, id)))}</small><div class="svc-next">${next(id)}</div></div>
      <div class="gitem-actions"><button type="button" class="btn small" data-command="uninstall ${id}" data-confirm="Sure? Half the code back" ${busy || s.install?.id === id ? 'disabled' : ''} title="Frees the port; half the code comes back">Uninstall</button></div></li>`).join('');
  // Only services you have the blueprint (or source) for; the rest are still out there.
  const free = Object.keys(SERVICES).filter((id) => !serviceVersion(s, id) && knows(s, id));
  const unknown = BLUEPRINTS.filter((id) => SERVICES[id] && !knows(s, id)).length + Object.keys(SERVICES).filter((id) => SERVICES[id].special && !knows(s, id)).length;
  const available = free.map((id) => {
    const d = SERVICES[id];
    const locked = d.special && !(s.recipes || []).includes(id);
    return `<li class="svc ${locked ? 'locked' : ''}"><div class="svc-main"><div class="gitem-head"><b class="svc-name">${glyph(id, 'badge')}${esc(d.name)}</b>${d.special ? `<span class="tag" title="${esc(d.about)}">special</span>` : ''}${s.install?.id === id ? '<span class="tag you">installing</span>' : ''}</div>
      ${locked ? `<span class="tag dim" title="Find ${id}.src in a vault, layer 2 or deeper">needs source</span>` : s.install?.id === id ? '' : `<div class="svc-next">${next(id)}</div>`}</div></li>`;
  }).join('');
  return `<div class="page-grid gear-page"><div style="display:grid;gap:12px;align-content:start">
    <section class="card server-head"><h2>Server · Lv ${serverLevel(s)}</h2><h1>${slotPips('node', used, total, 'Service slots')}</h1>
      ${(() => { const p = serverProgress(s); return p.next ? `<div class="lvl-row"><span class="lvl-bar"><span style="width:${(p.xp / p.next) * 100}%"></span></span><small>${p.xp}/${p.next} XP</small></div><p class="op-hint">Your server levels up from all the XP you earn. ${serverNext(p.level)}</p>` : ''; })()}
      ${matGrid(s)}</section>
    ${wallMarkup(s, now)}
    ${archMarkup(s)}
    <section class="card"><h2>Install queue</h2>${queue}</section>
    <section class="card"><h2>Running · ${Object.keys(s.services || {}).length}</h2>${running ? `<ul class="gstash">${running}</ul>` : '<p class="svc-line">none</p>'}${statSheet(s, 'server')}</section>
  </div><div style="display:grid;gap:12px;align-content:start">
    <section class="card blueprint-card"><h2>Blueprints · ${Object.keys(SERVICES).length - unknown}/${Object.keys(SERVICES).length}</h2>${available ? `<ul class="gstash">${available}</ul>` : `<p class="svc-line">${Object.keys(s.services || {}).length ? 'all built' : 'none'}</p>`}</section>
  </div></div>`;
}

export function logsMarkup(s) {
  return `<div class="page-grid"><section class="card"><h2>Logs</h2><ol class="fulllog">${s.logs.slice(-300).map((e) => `<li>c${e.cycle} · ${esc(e.message)}</li>`).join('')}</ol></section>
    <section class="card"><h2>Fight reports</h2><p>Balance telemetry for playtesting.</p>${s.reports.length ? `<details><summary>${s.reports.length} report(s)</summary><pre>${esc(JSON.stringify(s.reports.slice(-5), null, 1))}</pre></details>` : '<p>None yet.</p>'}</section></div>`;
}

export function lessonMarkup(t, lessons) {
  const lesson = lessons[t.index];
  const done = t.phase === 'complete';
  return `<section class="card lesson" id="lesson-card"><h2>Tutorial ${done ? '· complete' : `· ${t.index + 1} of ${lessons.length}`}</h2>
    <h1>${esc(done ? 'Done' : lesson.title)}</h1>
    <p>${esc(done ? t.result : t.phase === 'review' ? t.result : lesson.explain)}</p>
    ${!done && t.phase === 'ready' ? `<p class="expect">${esc(lesson.command)}</p>` : ''}
    ${t.error ? `<p style="color:var(--hot)">${esc(t.error)}</p>` : ''}
    <div class="row">${t.phase === 'review' ? '<button class="btn primary" data-tutorial="continue">Continue</button>' : ''}${done ? '<button class="btn primary" data-tutorial="finish">Back to Home</button><button class="btn" data-tutorial="replay">Replay</button>' : '<button class="btn" data-tutorial="exit">Leave tutorial</button>'}</div></section>`;
}

// ---------- the net ----------
// One column: header (where, Signal, pack), then the terminal. Everything you
// act on is in the terminal or the buttons under the prompt.

const NET_CLASS = { 'net-cmd': 'you', 'net-err': 'warn', 'net-good': 'good', 'net-file': 'file', 'net-ls': 'ls', 'net-sweep': 'sweep-li', 'net-out': 'note', 'run-start': 'good', intrusion: 'bad', victory: 'good', crashed: 'bad', disconnected: 'bad', 'jacked-out': 'good', trap: 'bad', 'pack-hit': 'bad', lead: 'good', located: 'good', warning: 'warn' };

// Who's in a SPRAWL-00 folder (presence.mjs): a dot each, friends lit, a name on hover.
const peopleChips = (list = []) => (list.length ? `<span class="ls-people" title="${esc(list.map((x) => x.handle + (x.fighting ? ' (fighting)' : '')).join(', '))}">${list.slice(0, 3).map((x) => `<span class="who${x.crew ? ' crew' : x.friend ? ' friend' : x.member ? ' member' : ''}${x.fighting ? ' fighting' : ''}">${esc(x.handle)}</span>`).join('')}${list.length > 3 ? `<span class="who more">+${list.length - 3}</span>` : ''}</span>` : '');
function lsMarkup(e) {
  const pulls = e.entries.filter((x) => x.pull).length;
  return `${e.here?.length ? `<div class="ls-here">here ${peopleChips(e.here)}</div>` : ''}<div class="ls">${pulls >= 2 ? `<div class="ls-all"><button type="button" class="tok act" data-run="pull all" title="Every file here into your pack">pull all · ${pulls}</button></div>` : ''}${e.entries.map((x) => {
    const tags = x.tags.filter((t) => !(t === 'pull' && x.pull)).map((t) => t === 'crew' ? '<span class="tag tag-crew" title="Crew room: an elite, built for a party. Very unlikely solo; three loot rolls, a blue at least.">◆ CREW</span>' : `<span class="tag tag-${esc(t)} ${t === 'guarded' || t === 'virus' ? 'warn' : 'dim'}">${esc(t)}</span>`).join('');
    const name = x.kind === 'dir' ? (x.name === '..' ? '..' : x.name + '/') : x.name;
    const main = x.cmd.endsWith(' ') ? `data-prefill="${esc(x.cmd)}"` : `data-run="${esc(x.cmd)}"`;
    // Counts for a contract: a small marker, the contract(s) on hover.
    const job = x.jobs?.length ? `<span class="ls-job" title="${esc(x.jobs.join('\n'))}">${glyph('contract')}</span>` : '';
    return `<div class="ls-row${job ? ' wanted' : ''}"><span class="ls-kind">${x.kind === 'dir' ? 'd' : x.kind === 'virus' ? '!' : '-'}</span><button type="button" class="tok ${x.kind}" ${main} title="${esc(x.cmd.trim())}">${esc(name)}</button>${job}<span class="ls-size">${esc(x.size || '')}</span>${tags}${peopleChips(x.people)}${x.pull ? `<button type="button" class="tok act" data-run="${esc(x.pull)}">pull</button>` : ''}</div>`;
  }).join('')}</div>`;
}

// Log sweep: which lines you've lit up, and the filter. Screen-only state; the answer is a command.
export const sweepUi = { flags: new Map(), filter: 'all', key: '' };
const SWEEP_COLORS = 3;
function sweepMarkup(s, e, live) {
  const p = e.sweep;
  const loc = s.locations.find((l) => l.id === e.location);
  const solved = loc?.state?.sweep?.solved || p.solved;
  if (!live) return `<div class="sweep past">${esc(e.message)}${solved ? ` <span class="tag you">swept</span>` : ''}</div>`;
  const key = e.location;
  if (sweepUi.key !== key) { sweepUi.key = key; sweepUi.flags = new Map(); sweepUi.filter = 'all'; }
  const f = sweepUi.filter;
  const shown = p.rows.filter((x) => f === 'all' || x.kind === f);
  const grid = `style="grid-template-columns:${p.cols.map((c, i) => (i === p.cols.length - 1 ? 'minmax(0,1fr)' : Math.max(c.length, ...p.rows.map((x) => x.cells[i].length)) + 1 + 'ch')).join(' ')}"`;
  const cell = (v, i, tone) => `<span class="sw-c${i === p.toneCol && tone ? ' ' + tone : ''}">${esc(v)}</span>`;
  const row = (x) => {
    const c = x.flag && sweepUi.flags.has(x.flag) ? ` flag${sweepUi.flags.get(x.flag)}` : '';
    const body = x.cells.map((v, i) => cell(v, i, x.tone)).join('');
    return x.flag ? `<button type="button" class="sw-line${c}${x.tone === 'dim' ? ' dimmed' : ''}" ${grid} data-sweep-flag="${esc(x.flag)}">${body}</button>` : `<div class="sw-line quiet" ${grid}>${body}</div>`;
  };
  const filt = (id, label) => `<button type="button" class="sw-filter${f === id ? ' on' : ''}" data-sweep-filter="${id}">${esc(label)}</button>`;
  const tries = loc?.state?.sweep?.tries || 0;
  const suspects = p.suspects.map((a) => (solved ? `<span class="sw-suspect${a === solved ? ' guilty' : ' cleared'}">${esc(a)}</span>` : `<button type="button" class="sw-suspect" data-run="sweep ${esc(a)}">${esc(a)}</button>`)).join('');
  return `<div class="sweep${solved ? ' solved' : ''}"><div class="sw-head"><b>${glyph('ids')}${esc(p.file)}</b><span class="sw-q">${esc(p.question)}</span><span class="sw-filters">${filt('all', 'All')}${filt('a', p.filters[0])}${filt('b', p.filters[1])}</span></div>${p.note ? `<div class="sw-note">${esc(p.note)}</div>` : ''}<div class="sw-cols sw-line" ${grid}>${p.cols.map((c) => `<span>${esc(c)}</span>`).join('')}</div><div class="sw-log">${shown.map(row).join('') || '<div class="sw-line quiet">nothing matches</div>'}</div><div class="sw-foot"><span class="sw-label">${solved ? 'Swept' : 'Your answer'}</span>${suspects}${!solved && tries ? `<small class="sw-tries">${tries} wrong</small>` : ''}</div></div>`;
}

// "Did you mean …?": the guess as a button (a guess ending in a space prefills the prompt instead).
export const suggestButton = (e) => (e.suggest ? ` <button type="button" class="tok act suggest" data-prefill="${esc(e.suggest)}">${esc(e.suggest.trim())}</button>` : '');

export function netTranscript(s, limit = 80) {
  const runStart = s.logs.findLastIndex((e) => e.type === 'run-start');
  // One folder at a time: from the cd that brought you here, unless you asked for the history.
  const room = s.run && !s.run.history && s.run.roomFrom ? s.logs.findIndex((e) => e.id === s.run.roomFrom) : -1;
  const start = room > runStart ? room : runStart;
  const earlier = start > runStart ? '<li class="note earlier"><button type="button" class="tok act" data-run="history">earlier</button></li>' : '';
  // Warnings from a fight (typos, bad targets) belong to the fight: the terminal skips them.
  const lines = s.logs.slice(Math.max(0, start)).filter((e) => NET_CLASS[e.type] !== undefined && !(e.type === 'warning' && e.fight)).slice(-limit);
  const lastSweep = lines.findLastIndex((e) => e.type === 'net-sweep');
  return earlier + lines.map((e, i) => `<li class="${NET_CLASS[e.type]}">${e.type === 'net-ls' && e.entries ? lsMarkup(e) : e.type === 'net-sweep' && e.sweep ? sweepMarkup(s, e, i === lastSweep) : esc(e.message) + suggestButton(e)}</li>`).join('');
}


export const signalLevel = (run) => (run.integrity / run.max <= 0.3 ? 'low' : run.integrity / run.max <= 0.6 ? 'mid' : 'ok');

// On a run, the Leads panel (toggled from the run's header): every trace in progress. A family's
// lead (kills of it), and each unknown server you can see (where it hangs off, its layer), with its
// percent; a contract's marker on the flagged ones. Click one to see it on the map.
function leadsPanel(s) {
  const fams = Object.entries(s.leadProgress || {}).filter(([f, n]) => FAMILIES[f] && n > 0).sort((a, b) => b[1] - a[1]);
  const nodes = shownHidden(s);
  const bar = (n) => `<span class="ld-bar"><span style="width:${Math.min(100, n)}%"></span></span><b class="ld-n">${Math.floor(n)}%</b>`;
  const famRows = fams.map(([f, n]) => `<li class="ld-row" data-go="map:lead-${esc(f)}" title="${esc(FAMILIES[f].name)} lead">${glyph(f)}<span class="ld-name">${esc(FAMILIES[f].name)}</span>${bar(n)}</li>`).join('');
  const nodeRows = nodes.map((n) => { const via = s.locations.find((l) => l.id === n.via); const flag = hiddenFlagged(s, n); return `<li class="ld-row${flag ? ' wanted' : ''}" data-go="map:${esc(n.id)}" title="Unknown ${n.pinged || n.seen ? esc(FAMILIES[n.family].name.toLowerCase()) + ' ' : ''}server past ${esc(via?.name || '?')}">${glyph('trace')}<span class="ld-name">? <small>${esc(via?.name || '')} · L${n.depth}</small></span>${flag ? `<span class="ls-job">${glyph('contract')}</span>` : ''}${bar(n.lead)}</li>`; }).join('');
  // Faction hubs you haven't located (once the board is open): their trace, from their servers.
  const hubRows = (hubsOf(s).length ? FACTION_IDS.filter((f) => !hubFound(s, f)) : []).map((f) => `<li class="ld-row" style="--fc:${FX[f].color}" title="${esc(FX[f].hub.name)}">${fIcon(f)}<span class="ld-name">${esc(FX[f].short)} <small>hub</small></span>${bar(hubTraceOf(s, f))}</li>`).join('');
  return `<aside class="net-leads"><h3>${glyph('trace')}Leads</h3>${famRows || nodeRows || hubRows ? `${famRows ? `<ul class="ld-list">${famRows}</ul>` : ''}${nodeRows ? `<h4>Unknown servers</h4><ul class="ld-list">${nodeRows}</ul>` : ''}${hubRows ? `<h4>Faction hubs</h4><ul class="ld-list">${hubRows}</ul>` : ''}` : '<p class="quiet">none</p>'}</aside>`;
}

export function netMarkup(s, { leads = false } = {}) {
  if (!s.run) {
    return `<div class="page-grid"><section class="card"><h2>The net</h2><h1>Not connected</h1><div class="row">${btn('connect ' + CONFIG.zone.id, 'Connect to ' + CONFIG.zone.name, true)}</div>${s.locations.length ? locationList(s) : ''}</section></div>`;
  }
  const loc = currentLocation(s);
  const pct = (s.run.integrity / s.run.max) * 100;
  const level = signalLevel(s.run);
  return `<section class="panel net-one" data-pane="ssh ${esc(s.profile?.handle || 'rookie')}@${esc(loc.id)}">
    <header class="net-head">
      <div class="net-where"><b>${esc(loc.name)}${loc.depth > 1 ? ` <span class="tag">layer ${loc.depth}</span>` : ''}${QUIRKS[loc.quirk] ? ` <span class="tag tag-quirk" data-quirk="${loc.quirk}" title="${esc(QUIRKS[loc.quirk].rule)}">${esc(QUIRKS[loc.quirk].name)}</span>` : ''}</b><span>${esc(s.run.cwd)}</span></div>
      <div class="net-signal ${level}" title="Signal: your health on this run. Moving costs ${CONFIG.cdCost}. At 0 you go home without your pack."><span class="lbl">Signal</span><span class="sigbar"><span style="width:${pct}%"></span></span><strong>${s.run.integrity}</strong><small>/${s.run.max}</small></div>
      ${!loc.zone && !loc.rogue ? `<div class="net-trace${(s.run.trace || 0) >= 70 ? ' hot' : (s.run.trace || 0) < TRACE.clean ? ' low' : ''}${s.run.hunter ? ' hunted' : ''}" title="Trace: how loud this break-in has been. Moves, pulls, wrong passwords and fights raise it; Spoof lowers it. At 100 a hunter comes and you can't jack out until it's down. Under ${TRACE.clean}% with the vault open: a clean job, +25% credits."><span class="lbl">Trace</span><span class="sigbar"><span style="width:${s.run.trace || 0}%"></span></span><strong>${s.run.hunter ? 'HUNTED' : (s.run.trace || 0) + '%'}</strong></div>` : ''}
      <button type="button" class="net-pack" data-run="pack" title="What you're carrying (unbanked)">pack <b>${s.run.pack.length}</b></button>
      <button type="button" class="net-pack net-leads-btn" data-leads aria-pressed="${leads}" title="Leads">${glyph('trace')}leads</button>
    </header>
    <div class="net-body${leads ? ' with-leads' : ''}"><ol class="term" id="term">${netTranscript(s)}</ol>${leads ? leadsPanel(s) : ''}</div>
  </section>`;
}

export function netTrayMarkup(actions) {
  return `<div class="next"><span class="next-label">here:</span>${actions.map((a) => `<button type="button" class="nextbtn ${a.hot ? 'hot' : ''}" ${a.prefill ? `data-prefill="${esc(a.prefill)}"` : `data-run="${esc(a.cmd)}"`}>${esc(a.label)}${a.note ? `<small>${esc(a.note)}</small>` : ''}</button>`).join('')}<button type="button" class="nextbtn quiet" data-run="help">help</button></div>`;
}

// ---------- daemons ----------

// A daemon's rule with its real number (version and your power).
const daemonRule = (s, id) => (DAEMONS[id].amount ? DAEMONS[id].rule.replace(String(DAEMONS[id].amount), String(id === 'watchman' ? watchmanBar(s) : daemonAmount(s, id))) : DAEMONS[id].rule);
export function daemonsMarkup(s) {
  const busy = active(s);
  const slotted = slottedDaemons(s), n = daemonSlots(s);
  const slots = Array.from({ length: n }, (_, i) => slotted[i]).map((id, i) => id
    ? `<li class="ptile"><span class="ptile-slot">${i + 1}</span><b class="iname">${glyph(id, 'badge')}${esc(DAEMONS[id].name)} v${daemonVersion(s, id)}</b><small>${esc(daemonRule(s, id))}${DAEMONS[id].once ? '' : ` · every ${DAEMONS[id].cooldown} cycles`}</small><button type="button" class="ptile-x" data-command="daemon unslot ${id}" ${busy ? 'disabled' : ''} title="Unslot" aria-label="Unslot ${esc(DAEMONS[id].name)}">×</button></li>`
    : `<li class="ptile empty"><span class="ptile-slot">${i + 1}</span><span class="ptile-empty">empty</span></li>`).join('');
  const owned = Object.keys(s.daemonsOwned || {}).filter((id) => DAEMONS[id] && !slotted.includes(id)).map((id) => `<li class="ptile stash"><b class="iname">${glyph(id, 'badge')}${esc(DAEMONS[id].name)} v${daemonVersion(s, id)}</b><small>${esc(daemonRule(s, id))}${DAEMONS[id].once ? '' : ` · every ${DAEMONS[id].cooldown} cycles`}</small><div class="ptile-acts"><button type="button" class="btn primary small" data-command="daemon slot ${id}" ${busy || slotted.length >= n ? 'disabled' : ''}>Slot</button></div></li>`).join('');
  return `<div class="page-grid gear-page"><section class="card daemon-slots"><h2>Daemons · ${slotted.length}/${n}</h2><ul class="ptiles">${slots}</ul></section>
    <section class="card"><h2>Found · ${Object.keys(s.daemonsOwned || {}).length}/${Object.keys(DAEMONS).length}</h2>${owned ? `<ul class="ptiles stash">${owned}</ul>` : '<p class="svc-line">none</p>'}</section></div>`;
}

// ---------- mail: letters, the contract board and the Halcyon retainer ----------
// sel: 'l<id>' a letter, 'j<id>' a contract (taken or on the board).
const jobTag = (s, c) => (c.done ? ['Done', 'dim'] : contractReady(s, c) ? ['Ready', 'you'] : c.offBooks ? ['Off books', 'hot'] : c.story !== undefined ? ['LOWLIGHT', ''] : ['Active', '']);
// Where a contract's work is: its server, an unknown one it points at, or SPRAWL-00 (the WoW quest tracker).
const trackGo = (c) => (c.loc ? `map:${c.loc}` : c.hidden ? `map:${c.hidden}` : c.type === 'bounty' || c.where === 'sprawl' ? 'map:sprawl' : null);
function jobBox(s, c, now) {
  const isOffer = c.expiresAt != null;
  const pr = contractProgress(s, c), ok = contractReady(s, c);
  const full = heldCount(s) >= MAIL.take;
  const acts = c.done ? '' : isOffer
    ? `<button type="button" class="btn primary" data-command="mail accept ${c.id}" ${full ? `disabled title="You hold ${MAIL.take} contracts. Deliver or drop one first."` : ''}>Take</button>`
    : `<button type="button" class="btn primary" data-command="mail deliver ${c.id}" ${ok ? '' : 'disabled'}>Deliver</button>${trackGo(c) && !ok ? `<button type="button" class="btn" data-go="${esc(trackGo(c))}">${glyph('trace')}Show on map</button>` : ''}${c.story === undefined ? `<button type="button" class="btn" data-command="mail drop ${c.id}">Drop</button>` : ''}`;
  return `<div class="contract${ok ? ' ready' : ''}${c.done ? ' done' : ''}${isOffer ? ' offer' : ''}">
    <div class="c-head"><b>${glyph({ kill: 'kill', strain: 'kill', bounty: 'bounty', takeover: 'takeover', materials: 'materials', item: 'item', side: 'f-' + c.faction }[c.type] || 'item', 'badge')}${esc(contractTitle(s, c))}</b>${c.offBooks ? '<span class="tag hot">Off the books</span>' : ''}${isOffer && c.type !== 'side' ? `<small class="c-exp">expires in ${fmtTime(c.expiresAt - now)}</small>` : isOffer ? '<span class="tag you">your call</span>' : ''}</div>
    ${isOffer ? '' : `<div class="lvl-row"><span class="lvl-bar"><span style="width:${Math.round(pr.part * 100)}%"></span></span><small>${esc(pr.text)}</small></div>`}
    <div class="rw-chips" title="${c.done ? 'Paid' : 'Pays'}: ${esc(rewardLine(s, c))}">${rewardChips(s, c)}</div>
    ${acts ? `<div class="row">${acts}</div>` : ''}
  </div>`;
}
export function mailMarkup(s, sel = null, now = Date.now()) {
  const letters = s.mail?.list || [], jobs = new Set((s.mail?.jobs || []).map((j) => j.id)), held = openContracts(s), board = [...mailOffers(s)].sort((a, b) => a.expiresAt - b.expiresAt);
  const pickSel = () => {
    if (sel?.[0] === 'l') { const l = letters.find((m) => m.id === Number(sel.slice(1))); if (l) return { letter: l }; }
    if (sel?.[0] === 'j') { const j = findJob(s, Number(sel.slice(1))); if (j) return { job: j }; }
    const l = letters.find((m) => !m.read);
    if (l && l.job != null && jobs.has(l.job)) { const j = findJob(s, l.job); if (j) return { job: j }; } // shown as its contract
    if (l) return { letter: l };
    if (held[0]) return { job: held[0] };
    return letters[0] ? { letter: letters[0] } : {};
  };
  const open = pickSel();
  const isOpen = (k) => (open.letter && k === 'l' + open.letter.id) || (open.job && k === 'j' + open.job.id);
  const row = (k, from, subject, tag, cls, extra = '', unreadRow = false) => `<li><button type="button" class="mrow${unreadRow ? ' unread' : ''}${isOpen(k) ? ' open' : ''}" data-mail="${k}"><span class="mfrom">${esc(from)}</span><span class="msubj">${esc(subject)}</span>${tag ? `<span class="tag ${cls}">${tag}</span>` : extra}</button></li>`;
  // A letter that came with a contract you took shows once: as that contract (Contracts or Completed).
  const taken = new Set((s.mail?.jobs || []).map((j) => j.id));
  const unreadJob = new Set(letters.filter((m) => m.job != null && taken.has(m.job) && !m.read).map((m) => m.job));
  const unreadLetters = letters.filter((m) => !m.read && !(m.job != null && taken.has(m.job))).length;
  const heldRows = held.map((c) => { const [t, cls] = jobTag(s, c); return row('j' + c.id, c.from, contractTitle(s, c), t, cls, '', unreadJob.has(c.id)); }).join('');
  const boardRows = board.map((c) => row('j' + c.id, c.from, c.subject, c.offBooks ? '<span title="GLASSJAW work through Halcyon\'s board: pays 1.6× the credits, costs Halcyon standing">Off books</span>' : '', c.offBooks ? 'hot' : '', `${fIcon(c.faction || 'halcyon')}<small class="mexp">${c.type === 'side' ? '<span title="A side offer: take this one or its rival. It never expires.">pick one</span>' : fmtTime(c.expiresAt - now)}</small>`)).join('');
  const letterRows = letters.filter((m) => m.job == null || !taken.has(m.job)).map((m) => row('l' + m.id, m.from, m.subject, '', '', '', !m.read)).join('');
  const done = doneContracts(s);
  const doneRows = done.map((c) => row('j' + c.id, c.from, contractTitle(s, c), c.story !== undefined ? '<span title="A job from LOWLIGHT, your crew: the storyline">LOWLIGHT</span>' : '', 'dim')).join('');
  const st = standing(s), tier = tierOf(s), next = nextTier(s);
  // A faction's chip shows once you've met it: found its hub, or found one of its servers.
  const met = hubsOf(s).length ? FACTION_IDS.filter((f) => f !== 'halcyon' && (hubFound(s, f) || (s.locations || []).some((l) => l.faction === f))) : [];
  const head = `<div class="standing" title="Standing ${st}/100${next ? `. ${next.name} at ${next.min}` : ''}. Contracts raise it; a crash on your server lowers it, and so does work for GLASSJAW.">
      <span class="st-name">${esc(FACTIONS.halcyon.name)}</span><span class="tag ${st ? 'you' : 'hot'}">${esc(tier.name)}</span>
      <span class="lvl-bar"><span style="width:${st}%"></span></span><b>${st}</b></div>
    <p class="svc-line">Retainer ${retainer(s)} credits · next in <span id="pay-left">${fmtTime(nextPayIn(s, now))}</span> · <b class="ind" title="Indemnity: Halcyon scrip, spent at its store.">${indemnity(s)} Indemnity</b></p>
    ${met.length ? `<div class="reps">${met.map((f) => `<button type="button" class="rep-chip" style="--fc:${FX[f].color}" data-go="hub:${f}" title="${esc(FX[f].name)}: ${rep(s, f)} · ${esc(repTier(s, f).name)}">${glyph('f-' + f)}<span>${esc(repTier(s, f).name)}</span></button>`).join('')}</div>` : ''}`;
  let reader = '<section class="card mread"><p class="quiet">No mail.</p></section>';
  const item = open.letter || open.job;
  if (item) {
    const j = open.job || (open.letter.job != null ? findJob(s, open.letter.job) : null);
    const body = item.body?.length ? item.body : letters.find((m) => m.job === item.id)?.body || []; // a contract reads as its letter
    reader = `<section class="card mread"><h2>${esc(item.from)}</h2><h1>${esc(item.subject)}</h1><div class="mbody">${body.filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('')}</div>${j ? jobBox(s, j, now) : ''}</section>`;
  }
  return `<div class="page-grid mail-page"><section class="card inbox">${head}
    <h2>Contracts · ${heldCount(s)}/${MAIL.take}</h2>${heldRows ? `<ul class="mlist">${heldRows}</ul>` : '<p class="quiet">None taken.</p>'}
    ${boardOpen(s) ? `<h2>Board · ${board.length}</h2>${boardRows ? `<ul class="mlist mboard">${boardRows}</ul>` : '<p class="quiet">Nothing on offer right now.</p>'}` : ''}
    ${letterRows ? `<h2>Letters${unreadLetters ? ` · ${unreadLetters} unread` : ''}</h2><ul class="mlist">${letterRows}</ul>` : ''}
    ${done.length ? `<h2 class="mdone-head">Completed · ${done.length}</h2><ul class="mlist mdone">${doneRows}</ul>` : ''}</section>${reader}</div>`;
}

// ---------- the pager's list (Comms) ----------
const agoShort = (ms) => (ms < 60000 ? `${Math.max(0, Math.round(ms / 1000))}s` : ms < 3600000 ? `${Math.floor(ms / 60000)}m` : ms < 86400000 ? `${Math.floor(ms / 3600000)}h` : `${Math.floor(ms / 86400000)}d`);
const GO_LABEL = { mail: 'Open', store: 'Store', map: 'Map', jack: 'Jack in' };
export function commsMarkup(s, filter = 'all', now = Date.now()) {
  const all = commsOf(s);
  const shown = all.filter((c) => filter === 'all' || commsGroup(c.kind) === filter);
  const rows = shown.map((c) => `<li class="citem ${c.kind}${c.seen ? '' : ' unseen'}${c.done ? ' done' : ''}"><span class="k ${c.kind}">${esc(c.label)}</span><span class="cfrom">${esc(c.from)}</span><span class="cage">${agoShort(now - c.t)}</span><p>${esc(c.text)}</p>${c.go ? `<button type="button" class="act" data-go="${esc(c.go)}" data-cid="${c.id}">${GO_LABEL[c.go.split(':')[0]] || 'Open'}</button>` : ''}<button type="button" class="act dim cclear" data-cclear="${c.id}" title="Clear">×</button></li>`).join('');
  return `<div class="comms-head"><span>Comms</span><span class="p-acts"><button type="button" class="act dim" data-comms-clear title="Clear everything you've seen">Clear</button><button type="button" class="act" data-comms-close>Close</button></span></div>
    <div class="comms-filters" role="group" aria-label="Show">${['all', ...Object.keys(COMMS_GROUPS)].map((f) => `<button type="button" data-cfilter="${f}" aria-pressed="${filter === f}">${f === 'all' ? 'All' : f}</button>`).join('')}</div>
    <ul class="comms-list">${rows || '<li class="quiet">Quiet.</li>'}</ul>`;
}

// ---------- people (presence.mjs): friends and who's online ----------
export function peopleMarkup(s, tab = 'friends', now = Date.now()) {
  const all = online(s, now), crew = (s.crewSim || []).map((x) => x.name);
  const c = consortiumOf(s), inv = s.consortiumInvite;
  const row = (x) => `<li class="person${x.friend ? ' friend' : ''}${x.member ? ' member' : ''}"><span class="p-dot${x.place.fighting ? ' fighting' : ''}"></span><b>${esc(x.handle)}</b><small>${esc(ARCHETYPES[x.cls].name)} ${x.level}</small><span class="p-where">${esc(whereText(x.place))}</span>
    <span class="p-acts">${c && !x.member && c.founder !== x.handle ? `<button type="button" class="act" data-run="consortium invite ${esc(x.handle)}" title="Merge their server with the consortium">Invite to consortium</button>` : ''}${crew.includes(x.handle) ? `<span class="tag you">crew</span><button type="button" class="act dim" data-run="crew kick ${esc(x.handle)}">Remove from crew</button>` : ''}${x.friend || x.member ? `${crew.includes(x.handle) ? '' : `<button type="button" class="act" data-run="crew invite ${esc(x.handle)}" ${crew.length >= 3 ? 'disabled title="Your crew is full"' : ''}>Invite to crew</button>`}${x.friend ? `<button type="button" class="act dim" data-run="friend remove ${esc(x.handle)}">Remove</button>` : ''}` : ''}${x.friend ? '' : `<button type="button" class="act" data-run="friend add ${esc(x.handle)}">Add friend</button>`}</span></li>`;
  const offline = friends(s).filter((h) => !all.some((x) => x.handle === h));
  const memberOffline = (c?.members || []).filter((h) => !all.some((x) => x.handle === h));
  const invCard = inv && !c ? `<li class="con-head invite"><b>${esc(inv.from)} invites you to ${esc(inv.name)}</b><small>Merge your server with ${inv.members.length} others: reach their outposts and servers, keep everything of yours.</small><span class="p-acts"><button type="button" class="act" data-run="consortium accept">Merge</button><button type="button" class="act dim" data-run="consortium decline">Decline</button></span></li>` : '';
  // Your crew: who's in it (up to CREW.max), where they are, and the open slots.
  const crewTab = () => {
    const members = s.crewSim || [];
    const rows = members.map((x) => {
      const p = all.find((y) => y.handle === x.name), onRun = s.run?.crew?.[x.name];
      const where = onRun ? `with you on ${esc(s.run.loc === 'sprawl' ? 'SPRAWL-00' : s.run.loc)} · ${esc(onRun.cwd)}${onRun.link === 'you' ? ' · linked' : ''}` : p ? esc(whereText(p.place)) : 'waiting for your next run';
      return `<li class="person crewmate"><span class="p-dot${p || onRun ? '' : ' off'}"></span><b>${esc(x.name)}</b><small>${esc(ARCHETYPES[x.cls].name)}${p ? ` ${p.level}` : ''}</small><span class="p-where">${where}</span>
        <span class="p-acts"><button type="button" class="act dim" data-run="crew kick ${esc(x.name)}">Remove from crew</button></span></li>`;
    }).join('');
    const open = Math.max(0, 3 - members.length);
    const slots = Array.from({ length: open }, () => '<li class="person crew-slot"><span class="p-dot off"></span><b>Open slot</b><span class="p-where" title="Invite a friend or a consortium member who\'s online">—</span></li>').join('');
    return `<li class="con-head"><b title="They join your run fights and follow you on runs">Your crew · ${members.length}/3</b>${members.length ? '<span class="p-acts"><button type="button" class="act dim" data-run="crew off">Disband</button></span>' : ''}</li>${rows}${slots}`;
  };
  const list = tab === 'friends'
    ? all.filter((x) => x.friend).map(row).join('') + offline.map((h) => `<li class="person off"><span class="p-dot off"></span><b>${esc(h)}</b><small>offline</small><span class="p-acts"><button type="button" class="act dim" data-run="friend remove ${esc(h)}">Remove</button></span></li>`).join('')
    : tab === 'crew'
    ? crewTab()
    : tab === 'consortium'
    ? (c ? `<li class="con-head"><b>${esc(c.name)}</b><small>${sizeOf(s)} servers merged${alertsOf(s).length ? ` · <b class="hot">${alertsOf(s).length} need${alertsOf(s).length === 1 ? 's' : ''} you</b>` : ''}</small><button type="button" class="btn primary small" data-go="consortium">Open the Consortium page</button></li>` + all.filter((x) => x.member).map(row).join('') + memberOffline.map((h) => `<li class="person off member"><span class="p-dot off"></span><b>${esc(h)}</b><small>away</small></li>`).join('') : invCard || '<li class="quiet">No consortium</li>')
    : invCard + all.map(row).join('');
  return `<div class="comms-head"><span>People${simOn(s) ? ' · simulated' : ''}</span><button type="button" class="act" data-people-close>Close</button></div>
    <div class="comms-filters" role="group" aria-label="Show">${[['friends', `Friends ${all.filter((x) => x.friend).length}/${friends(s).length}`], ['crew', `Crew ${(s.crewSim || []).length}/3`], ['consortium', c ? `Consortium ${all.filter((x) => x.member).length}/${c.members.length}` : inv ? 'Consortium •' : 'Consortium'], ['online', `Online ${all.length}`]].map(([k, l]) => `<button type="button" data-ptab="${k}" aria-pressed="${tab === k}">${esc(l)}</button>`).join('')}</div>
    <ul class="comms-list people-list">${list || `<li class="quiet">${!simOn(s) ? 'Nobody online. (online sim)' : tab === 'friends' ? 'No friends' : 'Nobody else is online.'}</li>`}</ul>`;
}

// ---------- the Consortium page (consortium.mjs) ----------
// Left: what needs someone now (a card each: what, how long, what it pays, one button), then the
// members. Right: the consortium and its size, the dividend, and how your server fares while away.
const ALARM = { raid: 'Invasion', siege: 'Invasion', roam: 'Invasion', crash: 'Crash', lockdown: 'Lockdown' };
function alarmCard(s, a, busy) {
  const pct = Math.max(0, Math.min(100, (a.left / a.total) * 100));
  const pays = a.bounty ? `${a.bounty.credits}c + ${a.bounty.code} ${esc(MATERIALS[codeOf(a.family)].name)}` : a.mine ? 'yours' : '';
  return `<article class="con-alarm k-${a.kind}${a.mine ? ' mine' : ''}">
    <div class="ca-top"><span class="ca-kind">${ALARM[a.kind]}${a.mine ? ' · yours' : ''}</span><span class="ca-time">${fmtTime(a.left)} left</span></div>
    <b class="ca-title">${esc(a.title)}</b>
    <p class="ca-detail">${esc(a.detail)}</p>
    <div class="ca-bar" title="Time left"><span style="width:${pct}%"></span></div>
    <div class="ca-foot"><span class="ca-meta">${levelTag(s, a.level)} ${esc(FAMILIES[a.family].name)}${pays ? ` · <b>${pays}</b>` : ''}</span><button type="button" class="btn primary" data-command="${esc(a.cmd)}" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>${esc(a.label)}</button></div>
  </article>`;
}
// The dividend as a table: one row per member outpost (who, where, what, an hour, waiting).
function dividendTable(s) {
  const rows = dividendSources(s);
  if (!rows.length) return '<p class="quiet">No member outposts yet.</p>';
  const what = (x) => (x.material ? MATERIALS[x.material].name : 'finds');
  return `<table class="div-table"><thead><tr><th>Member</th><th>Outpost</th><th>Yields</th><th class="num">/h</th><th>Waiting</th></tr></thead><tbody>${rows.map((x) => `<tr class="${x.stopped ? 'stopped' : ''}"><td>${esc(x.member)}</td><td><button type="button" class="act dim" data-go="map:con=${esc(x.id)}">${esc(x.name)}</button></td><td>${glyph(x.material || 'item')}${esc(what(x))}</td><td class="num">${x.stopped ? '<span class="tag hot" title="Invasion, lockdown or crash">0</span>' : x.rate.toFixed(1)}</td><td><span class="div-fill" title="${Math.floor(x.waiting)} of ${Math.floor(x.cap)}"><span style="width:${x.cap ? Math.min(100, (x.waiting / x.cap) * 100) : 0}%"></span></span><b>${Math.floor(x.waiting)}</b></td></tr>`).join('')}</tbody></table>`;
}
export function consortiumMarkup(s, now = Date.now()) {
  const c = consortiumOf(s), inv = s.consortiumInvite, busy = active(s) || !!s.run;
  if (!c) {
    const invite = inv ? `<section class="card alert"><h2>Invite · ${fmtTime(inv.left)} left</h2><h1>${esc(inv.name)}</h1>
      <p class="svc-line" title="Merge: reach their outposts and servers, share their dividend, keep everything of yours">${glyph('router')} ${esc(inv.from)} · ${inv.members.length + 1} members</p>
      <div class="row">${btn('consortium accept', 'Merge', true)}${btn('consortium decline', 'Decline')}</div></section>` : '';
    return `<div class="page-grid"><div class="con-col">${invite}<section class="card"><h2>Consortium</h2><h1 title="Merge servers with other hackers: reach each other's outposts and servers, share what their outposts make, defend each other while away">None</h1>
      <div class="row"><button type="button" class="btn ${inv ? '' : 'primary'}" data-prefill="consortium create ">Found one</button></div></section></div></div>`;
  }
  const alerts = alertsOf(s), on = online(s, now), onSet = new Set(on.map((x) => x.handle));
  const crew = (s.crewSim || []).map((x) => x.name);
  const member = (h) => {
    const p = on.find((x) => x.handle === h) || { ...profileOf(h), place: null };
    const mine = serversOf(s, h), raid = c.raid?.member === h, down = rebooting(s, h);
    const state = raid ? '<span class="tag hot">invasion at the wall</span>' : down ? '<span class="tag warn">rebooting</span>' : onSet.has(h) ? '<span class="tag tag-con">online</span>' : '<span class="tag dim">away</span>';
    // One aligned row: who, class and level, outposts, servers, where they are, state, actions.
    const there = p.place?.loc ? `map:con=${p.place.loc}` : `map:member-${h}`;
    return `<li class="con-member${onSet.has(h) ? '' : ' off'}${crew.includes(h) ? ' crew' : ''}"><span class="cm-dot${onSet.has(h) ? ' on' : ''}"></span><span class="cm-name"><b>${esc(h)}</b>${crew.includes(h) ? `<span class="cm-crew" title="In your crew">${glyph('run')}</span>` : ''}${c.founder === h ? '<small title="Founder">★</small>' : ''}</span>
      <span class="cm-cls">${esc(ARCHETYPES[p.cls].name)} <b>${memberLevel(s, h)}</b></span>
      <span class="cm-n" title="Outposts">${glyph('harvester')}${mine.filter((l) => l.held).length}</span><span class="cm-n" title="Servers">${glyph('node')}${mine.length}</span>
      <button type="button" class="cm-where act dim" data-go="${esc(there)}" title="Show on the map">${glyph('trace')}${p.place ? esc(whereText(p.place)) : 'home'}</button>
      <span class="cm-state">${state}</span>
      <span class="p-acts">${crew.includes(h) ? `<button type="button" class="act dim" data-run="crew kick ${esc(h)}">Remove from crew</button>` : onSet.has(h) ? `<button type="button" class="act" data-run="crew invite ${esc(h)}" ${crew.length >= 3 ? 'disabled' : ''}>Invite to crew</button>` : ''}${c.founder === 'you' ? `<button type="button" class="act dim" data-run="consortium kick ${esc(h)}">Kick</button>` : ''}</span></li>`;
  };
  const size = sizeOf(s), have = conTiers(s).length;
  const ladder = CONSORTIUM.tiers.map((t) => `<li class="${size >= t.at ? 'on' : ''}"><span class="tier-at">${t.at}</span><b>${esc(t.name)}</b><small>${esc(t.rule)}</small></li>`).join('');
  const w = dividendText(dividendWaiting(s)), r = dividendText(dividendRate(s), 1);
  return `<div class="page-grid con-page"><div class="con-col">
    <section class="card"><h2>Needs you${alerts.length ? ` · ${alerts.length}` : ''}</h2>
      ${alerts.length ? `<div class="con-alarms">${alerts.map((a) => alarmCard(s, a, busy)).join('')}</div>` : '<p class="quiet">All quiet on the trunk line.</p>'}</section>
    <section class="card"><h2>Members · ${c.members.filter((h) => onSet.has(h)).length} online of ${c.members.length}</h2>
      ${c.members.length ? `<ul class="con-members">${c.members.map(member).join('')}</ul>` : '<p class="quiet">Just you</p>'}</section>
  </div><div class="con-col">
    <section class="card"><h2>Consortium</h2><h1>${esc(c.name)}</h1>
      <p>${size} servers merged · founded by ${esc(c.founder)} · ${memberServers(s).length} servers on the network</p>
      <ol class="con-ladder">${ladder}</ol></section>
    <section class="card"><h2 title="${Math.round(CONSORTIUM.dividend.share * 100)}% of what every member's outpost makes, offline too">Dividend · ${Math.round(CONSORTIUM.dividend.share * 100)}%</h2>
      ${dividendTable(s)}
      <div class="con-waiting"><span><small>Waiting</small><b>${w ? esc(w) : 'nothing yet'}</b></span><button type="button" class="btn primary" data-command="consortium collect" ${w ? '' : 'disabled'}>Collect</button></div></section>
    <section class="card"><h2>While you're away</h2>${awayLine(s)}<div class="row">${btn('server', 'Firewall and services')}</div></section>
    <div class="row con-leave"><button type="button" class="btn small" data-command="consortium leave" data-confirm="Click again to leave">Leave</button></div>
  </div></div>`;
}

// ---------- the Halcyon store ----------
export function storeMarkup(s, now = Date.now()) {
  const L = hackerLevel(s), tierAt = tierIndex(s), have = kitOf(s);
  const credits = s.server.credits, ind = indemnity(s);
  const line = LINE.map((x) => {
    const locked = tierAt < x.tier;
    const price = x.chase ? `${x.indemnity} Indemnity` : `${x.credits(L)} credits`;
    const can = !locked && (x.chase ? ind >= x.indemnity : credits >= x.credits(L));
    return `<li class="ptile${x.chase ? ' chase' : ''}${locked ? ' locked' : ''}"><b class="iname${x.chase ? ' r-indemnified' : ''}">${glyph({ relay: 'relay', deductible: 'reduction', subrogation: 'countermeasures', actuarial: 'watchman', 'total-loss': 'hit' }[x.id], 'badge')}${esc(lineName(x))}</b><small>${esc(lineAbout(x))}</small>
      <div class="ptile-acts"><span class="price">${price}</span>${locked ? `<span class="tag dim">${esc(TIERS[x.tier].name)}</span>` : `<button type="button" class="btn ${can ? 'primary' : ''} small" data-command="buy ${x.id}" ${can ? '' : 'disabled'}>Buy</button>`}</div></li>`;
  }).join('');
  const shelf = storeOf(s).slots.map((slot) => {
    const g = GOODS[slot.id], x = { ...slot, price: priceNow(s, slot.id, slot.price, L) };
    const trend = x.drift > 1.08 ? '<i class="up" title="Above its usual price">▲</i>' : x.drift < 0.92 ? '<i class="down" title="Below its usual price">▼</i>' : '';
    return `<li class="ptile stash"><span class="agency">${esc(x.agency)}</span><b class="iname">${glyph({ signal: 'booster', crate: 'protocol' }[x.id] || x.id, 'badge')}${esc(g.name)}</b><small>${esc(goodsAbout(g, L))}</small>
      <div class="ptile-acts"><span class="price">${x.price} credits ${trend}</span><small class="qty">×${x.qty} · ${fmtTime(x.until - now)}</small><button type="button" class="btn ${credits >= x.price ? 'primary' : ''} small" data-command="buy ${x.key}" ${credits >= x.price && x.qty ? '' : 'disabled'}>Buy</button></div></li>`;
  }).join('');
  const kit = [['relay', 'Relays'], ['cracker', 'Key crackers'], ['injector', 'Trace injectors']].map(([k, n]) => stat(n, have[k] || 0)).join('');
  return `<div class="page-grid store-page"><div class="stack"><section class="card"><h2>Halcyon Mutual</h2>
      <div class="stats">${stat('Credits', credits)}${stat('Indemnity', ind)}${stat('Standing', `${standing(s)} · ${tierOf(s).name}`)}</div>
      <ul class="ptiles">${line}</ul></section>
    <section class="card"><h2>Plans</h2><ul class="plan-shelf">${Object.keys(OUTPOST.plans).map((id) => { const known = knowsPlan(s, id), price = planPrice(id, L); return `<li class="${known ? 'known' : ''}"><span class="iname" title="${esc(BUILDINGS[id].rule)}">${glyph(BICON[id] || 'module')}${esc(BUILDINGS[id].name)}</span><span class="tag dim">${BUILDINGS[id].spec ? 'specialisation' : 'building'}</span>${known ? '<span class="tag you">known</span>' : `<span class="price">${price}</span><button type="button" class="btn small ${credits >= price ? 'primary' : ''}" data-command="buy plan-${id}" ${credits >= price ? '' : 'disabled'}>Buy</button>`}</li>`; }).join('')}</ul></section>
    <section class="card"><h2>Your kit</h2><div class="stats">${kit}</div></section></div>
    <section class="card"><h2>Agency stock</h2><ul class="ptiles stash">${shelf || '<li class="quiet">The shelves are empty.</li>'}</ul></section></div>`;
}

// ---------- loadout: archetypes and talent tree ----------
// `view` is the archetype being browsed; the equipped one is s.loadout.archetype.
const TIER_NOTE = { picked: '', open: 'Pick one', locked: 'Needs a free point' };
const TREE_MAX = TREE.reduce((n, r) => n + (r.kind === 'choice' ? 1 : 6), 0);

const TAG_INFO = { status: 'Makes this class’s shared status', payoff: 'Stronger against statuses, from any class', crew: 'Mainly helps the crew; still useful solo', run: 'Used on runs, outside fights' };


export const className = (id) => ARCHETYPES[id]?.name || id;
export const xpNeeded = (level) => xpToNext(level);

export function loadoutMarkup(s, view, tab = 'protocols') {
  const equippedArch = s.loadout?.archetype || 'breaker';
  const id = ARCHETYPES[view] ? view : equippedArch;
  const a = ARCHETYPES[id];
  const busy = active(s) || !!s.run; // loadouts change at home, between fights
  const points = talentPoints(s, id), spent = pointsSpent(s, id), picks = picksOf(s, id);
  const lvl = hackerLevel(s, id), hk = hackerOf(s, id);
  const known = knownSkills(s, id), equipped = equippedSkills(s, id);
  const st = STATUSES[a.status];

  // Each class card: click to look at it; Use (any class you aren't playing) switches to it, at home.
  const tabs = Object.entries(ARCHETYPES).map(([k, x]) => `<div class="arch-card"><button type="button" class="arch${k === id ? ' on' : ''}" data-arch="${k}" aria-pressed="${k === id}">
      <span class="arch-name">${esc(x.name)} <span class="tag dim">Lv ${hackerLevel(s, k)}</span>${k === equippedArch ? ' <span class="tag you">in use</span>' : ''}</span><span class="arch-idea">${x.role.map((r) => `<span class="tag dim">${esc(r)}</span>`).join(' ')}</span></button>${k === equippedArch ? '' : `<button type="button" class="btn small arch-use" data-command="archetype ${k}" ${busy ? 'disabled title="At home only"' : `title="Play ${esc(x.name)}"`}>Use</button>`}</div>`).join('');

  // The bar you'll fight with: Spike, then your 7 equipped skills.
  const byId = Object.fromEntries(a.skills.map((x) => [x.id, x]));
  const bar = [
    ...CANTRIPS.map((c) => (unlockLevel(id, c.id) <= lvl
      ? `<li class="slot cantrip" title="${esc(c.rule)}"><kbd>${c.key}</kbd><b>${glyph('spike')}${esc(c.name)}</b><small>everyone</small></li>`
      : `<li class="slot empty" title="${esc(c.rule)}"><kbd>${c.key}</kbd><b>${esc(c.name)}</b><small>Lv ${unlockLevel(id, c.id)}</small></li>`)),
    ...Array.from({ length: LOADOUT.equipSlots }, (_, i) => {
      const sk = byId[equipped[i]];
      const future = a.skills.filter((x) => !known.includes(x.id))[i - equipped.length];
      return sk ? `<li class="slot on" title="${esc(scaledText(s, sk.id, sk.rule, id))}"><kbd>${i + 2}</kbd><b>${glyph(sk.verb, 'verb-' + sk.verb)}${esc(sk.name)}</b></li>` : `<li class="slot empty"><kbd>${i + 2}</kbd><b>${future && known.length < LOADOUT.equipSlots ? esc(future.name) : 'empty'}</b>${future && known.length < LOADOUT.equipSlots ? `<small>Lv ${unlockLevel(id, future.id)}</small>` : ''}</li>`;
    }),
  ].join('');

  const VERB = { hit: 'hit', burn: 'burn', stun: 'stun', debuff: 'debuff', shield: 'shield', heal: 'heal', buff: 'buff', util: 'utility', run: 'run' };
  // Its cooldown, as a little clock badge: cycles before you can use it again.
  const cdHtml = (x) => {
    const ab = ABILITIES[x.id];
    if (!ab) return '';
    if (ab.once) return '<span class="tag stag cd" title="Once per fight">1/fight</span>';
    const n = id === classOf(s) ? cooldownOf(s, x.id) : ab.cooldown || 0;
    return `<span class="tag stag cd${n ? '' : ' none'}" title="${n ? `Cooldown: ${n} ${n === 1 ? 'cycle' : 'cycles'} before you can use it again` : 'No cooldown'}">⟳ ${n || '—'}</span>`;
  };
  const tagHtml = (x) => `${cdHtml(x)}<span class="tag stag verb-${x.verb}" title="What it does">${VERB[x.verb] || x.verb}</span>`;
  const lib = a.skills.map((x) => {
    const isEq = equipped.includes(x.id), isKnown = known.includes(x.id);
    const state = isEq ? 'equipped' : isKnown ? 'known' : 'locked';
    const action = busy ? ''
      : isEq ? btn(`unequip ${id} ${x.id}`, 'Unequip')
      : isKnown ? `<button type="button" class="btn primary" data-command="equip ${id} ${x.id}" ${equipped.length >= LOADOUT.equipSlots ? `disabled title="All ${LOADOUT.equipSlots} slots full: unequip one first"` : ''}>Equip</button>`
      : `<span class="lvl-lock">Level ${unlockLevel(id, x.id)}</span>`;
    return `<li class="skill ${state}" title="${esc(scaledText(s, x.id, x.rule, id))}"><div class="skill-top"><b>${isEq ? `<kbd>${equipped.indexOf(x.id) + 2}</kbd>` : state === 'locked' ? '<span class="lock" aria-hidden="true"></span>' : ''}${glyph(x.verb, 'badge verb-' + x.verb)}${esc(x.name)}</b><span class="stags">${tagHtml(x)}</span></div>
      <div class="skill-foot"><p>${esc(scaledText(s, x.id, SKILL_TEXT[x.id]?.desc || ABILITIES[x.id]?.short || x.rule, id))}</p>${action}</div></li>`;
  }).join('');

  // The tree, top to bottom: ranked filler rows between the three choice tiers.
  const ranks = ranksOf(s, id);
  const needNote = (i) => `${spentAbove(s, id, i)}/${TREE[i].need}`;
  const tiers = TREE.map((row, i) => {
    if (row.kind === 'filler') {
      const rs = busy ? 'blocked' : rowState(s, id, i);
      const nodes = a.fillers[row.row].map((n) => {
        const r = ranks[n.id] || 0, full = r >= n.max;
        const can = !busy && rs === 'open' && !full;
        const pips = Array.from({ length: n.max }, (_, k) => `<span class="rpip${k < r ? ' on' : ''}"></span>`).join('');
        return `<div class="fnode ${r ? 'has' : ''} ${full ? 'full' : ''} ${can ? 'open' : rs}">
          <button type="button" class="fadd" ${can ? `data-command="talent ${id} add ${n.id}"` : 'disabled'} title="${can ? 'Add a rank' : ''}"><span class="tname">${esc(n.name)}</span><span class="trule">${esc(n.rule)}</span><span class="rpips" aria-label="${r} of ${n.max}">${pips}</span></button>
          ${r && !busy ? `<button type="button" class="fminus" data-command="talent ${id} remove ${n.id}" title="Take a rank back" aria-label="Take a rank back from ${esc(n.name)}">−</button>` : ''}
        </div>`;
      }).join('');
      const label = busy ? 'At home' : rs === 'blocked' ? needNote(i) : '';
      return `<li class="ttier frow ${rs}"><div class="tlabel"><b>Ranks</b><span>${label}</span></div><div class="fpair">${nodes}</div></li>`;
    }
    const t = row.tier, pair = a.talents[t];
    const ts = busy && tierState(s, id, t) !== 'picked' ? 'blocked' : tierState(s, id, t);
    const nodes = pair.map((tal, j) => {
      const picked = picks[t] === j, other = ts === 'picked' && !picked;
      const can = !busy && (ts === 'open' || other);
      const cls = picked ? 'picked' : other ? 'other' : ts;
      return `<button type="button" class="tnode ${cls}" ${can ? `data-command="talent ${id} ${t + 1} ${j ? 'b' : 'a'}"` : 'disabled'} aria-pressed="${picked}">
        <span class="tname">${picked ? '<span class="tcheck" aria-hidden="true">✓</span>' : ''}${esc(tal.name)}</span><span class="trule">${esc(tal.rule)}</span>${other ? '<span class="tswap">swap</span>' : ''}</button>`;
    }).join('<span class="tor" aria-hidden="true">or</span>');
    const label = busy ? 'At home' : ts === 'blocked' ? needNote(i) : TIER_NOTE[ts];
    return `<li class="ttier ${ts}"><div class="tlabel"><b>${t === 2 ? 'Capstone' : 'Tier ' + (t + 1)}</b><span>${label}</span></div><div class="tpair">${nodes}</div></li>`;
  }).join('');

  return `<div class="loadout">
    <nav class="arch-tabs" aria-label="Classes">${tabs}</nav>
    <nav class="ltabs" role="tablist" aria-label="Loadout">${[['protocols', 'Protocols'], ['daemons', `Daemons${newOn(s, 'daemons') ? ` · ${newOn(s, 'daemons')} new` : ''}`], ['skills', `Skills and talents${Math.max(0, points - spent) ? ` · ${Math.max(0, points - spent)} free` : ''}`]].map(([k, l]) => `<button type="button" role="tab" data-ltab="${k}" aria-selected="${tab === k}">${esc(l)}</button>`).join('')}</nav>
    ${tab === 'daemons' ? daemonsMarkup(s) : tab === 'skills' ? `
    <div class="loadout-grid">
      <section class="card skills-card">
        <div class="thead"><div><h2>Skills</h2><h1>${esc(a.name)}</h1><div class="class-xp"><b>Lv ${lvl}</b>${lvl < LOADOUT.maxLevel ? `<span class="lvl-bar"><span style="width:${(hk.xp / xpToNext(lvl)) * 100}%"></span></span><span>${hk.xp}/${xpToNext(lvl)} XP</span>` : '<span>max level</span>'}</div></div>
          ${id === equippedArch ? '<span class="tag you">in use</span>' : busy ? '' : btn(`archetype ${id}`, `Use ${a.name}`, true)}</div>
        <p class="status-line" title="${esc(st.rule)}"><span class="status-label">Applies</span> <span class="tag stag status">${esc(st.name)}</span></p>
        <ol class="keybar" aria-label="Your bar">${bar}</ol>
        <div class="lib-head"><h2>Library · ${known.length}/${a.skills.length}</h2></div>
        <ul class="library">${lib}</ul>
      </section>
      <section class="card ttree-card"><div class="thead"><div><h2>Talent tree</h2><h1>${esc(a.name)}</h1></div>
        <div class="tpoints" title="A talent point every ${LOADOUT.talentEvery} levels from level ${LOADOUT.talentFrom}."><span class="tbar"><span style="width:${Math.min(100, (spent / TREE_MAX) * 100)}%"></span></span><span><b>${Math.max(0, points - spent)} free</b> · ${spent}/${TREE_MAX} spent · ${points} earned</span></div></div>
        <ol class="ttree">
          <li class="troot"><span class="tag">passive</span><b>${esc(a.passive.name)}</b><span class="trule">${esc(a.passive.rule)}</span></li>
          <li class="troot${lvl < unlockLevel(id, 'edge') ? ' locked' : ''}"><span class="tag">${lvl < unlockLevel(id, 'edge') ? `Lv ${unlockLevel(id, 'edge')}` : 'edge'}</span><b>${esc(EDGE[id].name)}</b><span class="trule">${esc(EDGE[id].rule)}</span></li>
          ${tiers}
        </ol>
        ${spent && !busy ? `<p class="tfoot">${btn(`talent reset ${id}`, 'Clear picks')}</p>` : ''}
      </section>
    </div>` : id === equippedArch ? `
    <div class="loadout-protocols">${protocolStashCard(s)}${protocolSlotsCard(s)}</div>` : `
    <div class="loadout-protocols one"><section class="card"><h2>Protocols</h2><p class="svc-line"><span class="tag dim" title="Protocols belong to the class in use">${esc(a.name)} only</span></p></section></div>`}
    </div>`;
}

// ---------- the map ----------
function homeBars(s) {
  // Under HOME on the map: the server's Integrity as a bar (teal, amber below 60%, red below 30%).
  const srv = s.server, f = Math.max(0, Math.min(1, srv.integrity / srv.max)), hue = f <= 0.3 ? 'low' : f <= 0.6 ? 'mid' : '';
  return `<g transform="translate(0 50)"><g class="mbars"><g class="hb hp ${hue}"><title>Integrity ${srv.integrity}/${srv.max}</title><rect x="-28" y="-2" width="56" height="4" rx="1" class="hb-track"/><rect x="-28" y="-2" width="${(56 * f).toFixed(1)}" height="4" rx="1" class="hb-fill"/></g></g></g>`;
}
// Your server sits at the centre. Each virus family owns a direction; its
// origins sit on the first ring, and deeper layers branch outward from the
// node that pointed to them. Leads in progress are ghost nodes.

const SECTOR = { ransomware: -10, worm: 90, ghostroot: 195 };
const GATE = -90;
const R1 = 230, R2 = 150, SPREAD = 38;
const rad = (d) => (d * Math.PI) / 180;
const at = (angle, r) => ({ x: Math.round(Math.cos(rad(angle)) * r), y: Math.round(Math.sin(rad(angle)) * r), angle, r });

// The intrusion at your gate: the current one, or one parked while you fought an invader.
export function gateOf(s) {
  const e = s.encounter;
  if (e && e.mode !== 'run' && !e.invader && (e.phase === 'alert' || e.phase === 'active')) return e;
  return s.gate || null;
}
// Where invaders stop: just outside the server, further out below it (clear of its labels).
const wallR = (angle) => (Math.abs(((angle % 360) + 360) % 360 - 90) <= 45 ? 150 : 105);
export function mapLayout(s) {
  const nodes = [{ id: 'server', kind: 'server', ...at(0, 0) }];
  const links = [];
  // The rogue server: always there, straight up from home.
  zoneSpawns(s);
  nodes.push({ id: CONFIG.zone.id, kind: 'zone', ...at(GATE, 175) });
  links.push({ from: 'server', to: CONFIG.zone.id });
  const e = gateOf(s);
  if (e) {
    nodes.push({ id: 'intrusion', kind: 'intrusion', ...at(GATE + 28, 120), virus: e.virus, fighting: e.phase === 'active' });
    links.push({ from: 'server', to: 'intrusion', hot: true });
  }
  const byId = {};
  const roots = s.locations.filter((l) => !l.parent || !s.locations.some((p) => p.id === l.parent));
  for (const fam of Object.keys(SECTOR)) {
    const mine = roots.filter((l) => l.family === fam);
    const lead = s.leadProgress?.[fam] || 0;
    const count = mine.length + (lead > 0 ? 1 : 0);
    mine.forEach((l, i) => {
      const n = { id: l.id, kind: 'location', loc: l, flip: i % 2 === 1, ...at(SECTOR[fam] + (i - (count - 1) / 2) * SPREAD, R1) };
      nodes.push(n); byId[l.id] = n;
      links.push({ from: 'server', to: l.id });
    });
    if (lead > 0) {
      nodes.push({ id: 'lead-' + fam, kind: 'lead', family: fam, progress: lead, ...at(SECTOR[fam] + (count - 1 - (count - 1) / 2) * SPREAD, R1) });
      links.push({ from: 'server', to: 'lead-' + fam, ghost: true });
    }
  }
  // Deeper layers, parents before children (locations are stored in creation order). Unknown
  // servers you've heard of (a lead, a relay ping) sit among them as "?".
  const shown = shownHidden(s);
  const kids = (id) => [...s.locations.filter((x) => x.parent === id), ...shown.filter((n) => n.via === id)];
  for (const l of s.locations) {
    if (byId[l.id]) continue;
    const parent = byId[l.parent];
    if (!parent) continue;
    const siblings = kids(l.parent);
    const k = siblings.indexOf(l);
    const n = { id: l.id, kind: 'location', loc: l, flip: k % 2 === 1, ...at(parent.angle + (k - (siblings.length - 1) / 2) * 20, parent.r + R2) };
    nodes.push(n); byId[l.id] = n;
    links.push({ from: l.parent, to: l.id });
  }
  for (const h of shown) {
    const parent = byId[h.via];
    if (!parent) continue;
    const siblings = kids(h.via), k = siblings.indexOf(h);
    const n = { id: h.id, kind: 'hidden', hidden: h, flip: k % 2 === 1, ...at(parent.angle + (k - (siblings.length - 1) / 2) * 20, parent.r + R2) };
    nodes.push(n); byId[h.id] = n;
    links.push({ from: h.via, to: h.id, ghost: true });
  }
  // Faction hubs: the public net, on a ring of their own between the first two layers.
  const HUB_ANGLE = { halcyon: -50, kestrel: 40, lantern: 142, glassjaw: 220, nullchoir: 250 };
  for (const h of hubsOf(s)) {
    nodes.push({ id: h.id, kind: 'hub', hub: h, ...at(HUB_ANGLE[h.faction] ?? 0, R1 + 78) });
    links.push({ from: 'server', to: h.id, ghost: true });
  }
  // The invader: moving in from its location, then at your wall.
  const inv = s.invasion, src = inv && byId[inv.from];
  if (src) {
    const wall = at(src.angle, wallR(src.angle)), start = at(src.angle, src.r - 52); // sets out from just inside its location
    const p = inv.state === 'travel' ? Math.round((1 - inv.left / inv.total) * 50) / 50 : 1; // 2% steps
    nodes.push({ id: 'invader', kind: 'invader', inv, x: Math.round(start.x + (wall.x - start.x) * p), y: Math.round(start.y + (wall.y - start.y) * p) });
    links.push({ from: inv.from, to: 'invader', hot: inv.state === 'breach', ghost: inv.state === 'travel' });
  }
  // A fleet: from where it gathered, in toward the outpost it's after.
  const f = s.fleet, tgt = f && byId[f.target];
  if (tgt) {
    const src = (f.hidden && byId[f.hidden]) || (f.from && byId[f.from]) || at(tgt.angle, tgt.r + 80);
    const p = f.state === 'travel' ? Math.round((1 - fleetLeft(s) / f.travel) * 50) / 50 : 1;
    const k = 0.82 * p; // it stops just short of the outpost
    nodes.push({ id: 'fleet', kind: 'fleet', fleet: f, angle: tgt.angle, x: Math.round(src.x + (tgt.x - src.x) * k), y: Math.round(src.y + (tgt.y - src.y) * k), tx: tgt.x, ty: tgt.y });
    links.push({ from: 'fleet', to: f.target, hot: f.state === 'siege', ghost: f.state === 'travel' });
  }
  return { nodes, links };
}

// The consortium's network: your home server in the middle, a trunk line out to each member's
// home server on a ring, and each member's servers branching off theirs (consortium.mjs).
const RM = 210, RS = 130;
export function consortiumLayout(s) {
  const c = consortiumOf(s);
  const nodes = [{ id: 'server', kind: 'server', ...at(0, 0) }], links = [];
  const n = Math.max(1, c.members.length), step = 360 / n, on = new Set(online(s).map((x) => x.handle));
  c.members.forEach((h, i) => {
    const angle = -90 + i * step;
    nodes.push({ id: 'member-' + h, kind: 'member', handle: h, online: on.has(h), ...at(angle, RM) });
    links.push({ from: 'server', to: 'member-' + h, trunk: true });
    const mine = serversOf(s, h), spread = Math.min(26, step / Math.max(1, mine.length));
    mine.forEach((l, k) => {
      nodes.push({ id: l.id, kind: 'location', loc: l, flip: k % 2 === 1, ...at(angle + (k - (mine.length - 1) / 2) * spread, RM + RS + (k % 2) * 60) }); // staggered, so close neighbours' labels don't collide
      links.push({ from: 'member-' + h, to: l.id });
    });
  });
  const trunk = memberServers(s).find((l) => l.trunk);
  if (trunk) { nodes.push({ id: trunk.id, kind: 'location', loc: trunk, ...at(-90 + step / 2, 105) }); links.push({ from: 'server', to: trunk.id, trunk: true }); }
  // The travelling virus, on its way between two outposts (yours sit at your home node here).
  const r = c.roamer, end = (id) => nodes.find((x) => x.id === id) || nodes[0];
  if (r) {
    const a = end(r.from), b = end(r.to), p = Math.round((1 - r.left / r.total) * 50) / 50;
    nodes.push({ id: 'roamer', kind: 'roamer', roamer: r, x: Math.round(a.x + (b.x - a.x) * p), y: Math.round(a.y + (b.y - a.y) * p), tx: b.x, ty: b.y });
    links.push({ from: 'roamer', to: b.id, ghost: true });
  }
  return { nodes, links };
}

// A tiny fill gauge for a map label (an outpost's stockpile): ▮▮▯▯.
const gauge = (n, of, cells = 4) => { const k = Math.max(0, Math.min(cells, Math.round((n / Math.max(1, of)) * cells))); return '▮'.repeat(k) + '▯'.repeat(cells - k); };

function nodeState(s, l) {
  const taken = takenOf(l), total = takeable(l).length;
  if (s.run?.loc === l.id) return 'here';
  if (taken >= total) return 'done';
  if (taken || l.runs) return 'partial';
  return 'new';
}

// How much a server asks of you right now, as classes for the map (filters dim the rest):
// f-threat (something attacking it), f-mine (yours, or your outpost), f-target (a contract, a fresh
// find, somewhere you haven't been), and minor (nothing to do there: finished, detached, a rogue
// you're not in, or yours and quiet): a minor server is a dim dot, its name on hover or zoom.
function mapTags(s, l, st, job) {
  const o = l.outpost || {};
  const threat = !!(o.lockdown || l.held?.siege || l.held?.lockdown || s.fleet?.target === l.id || eventsAt(s, l.id).length);
  const mine = !!(l.takenOver || l.held);
  const fresh = !!(l.fresh && l.detached);
  const target = job || fresh || (st === 'new' && !l.rogue && !mine);
  const minor = st !== 'here' && !threat && !job && !fresh && (s.locations.includes(l) && !isLive(s, l) || l.rogue || st === 'done' || (mine && !isOutpost(l) && !l.build));
  return `${threat ? ' f-threat' : ''}${mine ? ' f-mine' : ''}${target ? ' f-target' : ''}${minor ? ' minor' : ''}`;
}

// The map is a quiet network scope: hairline links, small nodes, range rings for the wall and
// each layer, labels set outward from home. Selection is a reticle, not a glow.
const reticle = (r) => { const k = 5, q = r + 4; return `<path class="mreticle" d="M${-q} ${-q + k}V${-q}H${-q + k}M${q - k} ${-q}H${q}V${-q + k}M${q} ${q - k}V${q}H${q - k}M${-q + k} ${q}H${-q}V${q - k}"/>`; };
// Where a node's name goes: outward from home, so labels never sit on the links.
function labelAt(n, r) {
  const ang = n.angle ?? Math.atan2(n.y, n.x) * 180 / Math.PI;
  const c = Math.cos(ang * Math.PI / 180), si = Math.sin(ang * Math.PI / 180);
  if (c > 0.4) return { x: r + 12, y: 3, a: 'start' };
  if (c < -0.4) return { x: -r - 12, y: 3, a: 'end' };
  return si > 0 ? { x: 0, y: r + 17, a: 'middle' } : { x: 0, y: -r - 22, a: 'middle' };
}
const label = (n, r, name, sub, cls = '') => { const p = labelAt(n, r); return `<text x="${p.x}" y="${p.y}" class="mlabel ${cls}" text-anchor="${p.a}">${esc(name)}</text>${sub ? `<text x="${p.x}" y="${p.y + 15}" class="msub" text-anchor="${p.a}">${esc(sub)}</text>` : ''}`; };
// A server's label with its level up front: the level big and coloured by how hard it is for you
// (WoW colours), the layer as a tag, then whatever else (outpost, siege…). The name can hide.
const lvLabel = (s, n, r, name, level, depth, rest = '', cls = '') => {
  const p = labelAt(n, r), gap = level - hackerLevel(s);
  // The layer is the ring it sits on; a server you own needs no level (its colour says it's yours).
  const lv = level != null ? `<tspan class="mlv ${conClass(gap)}" dx="0">lv ${level}</tspan>` : '';
  const sub = lv + (rest ? `<tspan dx="${lv ? 6 : 0}">${esc(rest)}</tspan>` : '');
  return `<text x="${p.x}" y="${p.y}" class="mlabel ${cls}" text-anchor="${p.a}">${esc(name)}</text>${sub ? `<text x="${p.x}" y="${p.y + 16}" class="msub" text-anchor="${p.a}">${sub}</text>` : ''}`;
};
// A thin progress arc around a node (share 0–1).
const arc = (r, share, cls) => { const c = 2 * Math.PI * r; return `<circle r="${r}" class="marc-bg ${cls}"/><circle r="${r}" class="marc ${cls}" stroke-dasharray="${(c * Math.min(1, share)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90)"/>`; };

// The threat rail, down the left of the map: everything coming for you or under way, soonest first,
// each with its timer as a bar. Click one to select it on the map.
export function threatsOf(s, now = Date.now()) {
  const out = [], add = (x) => out.push(x);
  if (s.degraded) add({ cls: 'hot', icon: 'server', name: 'Rebooting', where: 'your server', left: degradedLeft(s, now), total: s.degraded.ms || 10 * 60000, sel: 'server' });
  const inv = s.invasion;
  if (inv) add(inv.state === 'travel'
    ? { cls: 'warn', icon: 'kill', name: inv.name, where: 'invasion · your wall', tag: `lv ${inv.level}`, left: inv.left, total: inv.total, sel: 'invader', verb: 'arrives' }
    : { cls: 'hot', icon: 'kill', name: inv.name, where: inv.state === 'siege' ? 'contested at your wall' : 'BREACH at your wall', tag: `lv ${inv.level}`, pct: inv.hp, sel: 'invader' });
  else if (threatTop(s) && s.net?.next > 0) add({ cls: 'dim', icon: 'clock', name: 'Next invasion', where: s.net.open ? 'ports open' : 'your wall', left: s.net.next, total: s.net.open ? CONFIG.invasion.everyMs[1] * CONFIG.invasion.open.pace : CONFIG.invasion.everyMs[1], sel: 'server' });
  const f = s.fleet;
  if (f && !f.hub) { const tgt = s.locations.find((l) => l.id === f.target); add({ cls: f.state === 'siege' ? 'hot' : 'warn', icon: 'kill', name: `Swarm ×${f.ships}`, where: `${f.state === 'siege' ? 'at' : '→'} ${tgt?.name || 'outpost'}`, tag: `lv ${f.level}`, left: fleetLeft(s, now), total: f.state === 'travel' ? f.travel : FLEET.siegeMs, sel: 'fleet', verb: f.state === 'travel' ? 'arrives' : 'falls' }); }
  for (const l of (s.locations || []).filter((x) => isOutpost(x))) {
    const o = l.outpost;
    if (o?.lockdown) add({ cls: 'hot', icon: 'takeover', name: 'Lockdown', where: l.name, left: o.lockdown.left, total: OUTPOST.lockdownMs, sel: l.id, verb: 'ends' });
  }
  for (const l of (s.locations || []).filter((x) => x.build)) add({ cls: 'dim', icon: 'module', name: BUILDINGS[l.build.id].name, where: l.name, left: l.build.doneAt - Date.now(), total: l.build.doneAt - l.build.startedAt, sel: l.id, verb: 'done' }); // builds running (outpost.mjs)
  const r = retakeOf(s);
  if (r) add({ cls: r.state === 'siege' ? 'hot' : 'warn', icon: 'kill', name: `Swarm ×${r.ships}`, where: `${r.state === 'siege' ? 'at' : '→'} your ${FX[r.f].short} hub`, tag: `lv ${r.level}`, left: retakeLeft(s, now), total: r.state === 'travel' ? HUBS.travelMs : HUBS.siegeMs, sel: 'hub-' + r.f, verb: r.state === 'travel' ? 'arrives' : 'falls' });
  for (const h of Object.values(s.hubs || {})) if (h.captured?.lockdown) add({ cls: 'hot', icon: 'takeover', name: 'Lockdown', where: `your ${FX[h.faction].short} hub`, sel: h.id });
  for (const ev of eventsOf(s)) { const c = EVENT_CARDS[ev.card], l = s.locations.find((x) => x.id === ev.loc); add({ cls: 'drop', icon: c.fight ? 'kill' : 'signal', name: c.fight ? ev.name : `${c.name}: ${FAMILIES[ev.family]?.name || ''}`, where: l ? l.name : 'double code', left: ev.left, total: c.ms, sel: l ? l.id : 'server', verb: c.fight ? 'leaves' : 'ends' }); }
  const rank = { hot: 0, warn: 1, drop: 2, dim: 3 };
  return out.sort((a, b) => rank[a.cls] - rank[b.cls] || (a.left ?? 0) - (b.left ?? 0));
}
function threatRail(s) {
  const list = threatsOf(s);
  if (!list.length) return '';
  return `<aside class="threat-rail" aria-label="Threats and timers">${list.map((x) => { const pct = x.pct != null ? x.pct : x.total ? Math.max(0, Math.min(1, 1 - (x.left || 0) / x.total)) : 1; return `<button type="button" class="tr-row ${x.cls}" data-select="${esc(x.sel)}">${glyph(x.icon)}<span class="tr-txt"><b>${esc(x.name)}${x.tag ? ` <small>${esc(x.tag)}</small>` : ''}</b><small>${esc(x.where)}</small></span><span class="tr-t">${x.left != null ? fmtTime(x.left) : x.pct != null ? `${Math.round(x.pct * 100)}%` : ''}</span><span class="tr-bar"><i style="width:${(pct * 100).toFixed(0)}%"></i></span></button>`; }).join('')}</aside>`;
}

// Traffic on the net: files moving between servers, as dots along the links. Your market orders
// and payloads run home ↔ hub; the hubs trade among themselves along the backbone that joins them.
// The markup only says where each dot runs and when (a route and its clock); app.js moves them, so
// the map doesn't redraw to animate. Hostile or offline hubs carry no backbone traffic.
// A file is a page with a folded corner; a payload is a spiked virus. The arrow ahead of it turns
// with the route (app.js), so you can read which way it's going.
const PKT_ICON = {
  you: '<path class="pk-icon" d="M-4 -5.5 H2 L4.5 -3 V5.5 H-4.5 V-5.5 Z M2 -5.5 V-3 H4.5"/>',
  pay: '<path class="pk-icon" d="M0 -6.5 L1.6 -2.6 L5.6 -3.2 L3 0 L5.6 3.2 L1.6 2.6 L0 6.5 L-1.6 2.6 L-5.6 3.2 L-3 0 L-5.6 -3.2 L-1.6 -2.6 Z"/>',
};
const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function trafficMarkup(s, nodes) {
  const hubs = nodes.filter((n) => n.kind === 'hub'), home = nodes.find((n) => n.id === 'server');
  const byF = Object.fromEntries(hubs.map((n) => [n.hub.faction, n]));
  const routes = [], dots = [];
  // The backbone: an arc on the hubs' ring between each found hub and the next one round.
  const live = hubs.filter((n) => !offline(s, n.hub.faction)).sort((a, b) => ((a.angle + 360) % 360) - ((b.angle + 360) % 360));
  if (live.length >= 2) {
    live.forEach((a, i) => {
      const b = live[(i + 1) % live.length];
      if (live.length === 2 && i === 1) return; // two hubs: one arc, not a circle
      const sweep = ((b.angle - a.angle) % 360 + 360) % 360, r = a.r, id = `bb-${a.hub.faction}-${b.hub.faction}`;
      routes.push(`<path class="mbone" data-rid="${id}" d="M${a.x} ${a.y} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x} ${b.y}"/>`);
      const h = hash(id), period = 26000 + (h % 5) * 5000;
      const fa = FX[a.hub.faction].color, fb = FX[b.hub.faction].color;
      // What actually moves: each ware goes from the hub where it's cheap to the one that pays more
      // for it, the biggest gaps first. Each lap carries the next of them (app.js picks by lap).
      const ships = WARE_IDS.map((w) => { const pa = priceOf(s, a.hub.faction, w), pb = priceOf(s, b.hub.faction, w); return { w, back: pa > pb ? 1 : 0, gap: Math.max(pa, pb) / Math.max(0.01, Math.min(pa, pb)), lo: Math.round(Math.min(pa, pb)), hi: Math.round(Math.max(pa, pb)) }; }).sort((x, y) => y.gap - x.gap).slice(0, 3);
      dots.push(`<g class="mpkt amb" data-route="${id}" data-period="${period}" data-phase="${(h % 997) / 997}" data-ca="${fa}" data-cb="${fb}" data-fa="${a.hub.faction}" data-fb="${b.hub.faction}" data-ships="${esc(JSON.stringify(ships))}"><circle r="12" class="pk-hit"/><g class="pk-file">${PKT_ICON.you}</g><path class="pk-dir" d="M13 0 L8 -4 L9.5 0 L8 4 Z"/></g>`);
    });
  }
  // Yours: market orders and payloads in flight, home ↔ the hub. Outgoing runs out, incoming runs home.
  const mine = (f, id, t0, t1, out, cls, tip) => {
    const n = byF[f]; if (!n || !home) return;
    if (!routes.some((r) => r.includes(`data-rid="hr-${f}"`))) routes.push(`<path class="mroute" data-rid="hr-${f}" d="M${home.x} ${home.y} L${n.x} ${n.y}"/>`);
    dots.push(`<g class="mpkt ${cls}" data-route="hr-${f}" data-t0="${t0}" data-t1="${t1}"${out ? '' : ' data-rev="1"'} data-tip="${esc(JSON.stringify(tip))}"><circle r="14" class="pk-hit"/><g transform="scale(1.5)">${PKT_ICON[cls]}</g><path class="pk-dir" d="M20 0 L12 -6 L14.5 0 L12 6 Z"/></g>`);
  };
  for (const x of transfersOf(s)) {
    const sell = x.side === 'sell';
    mine(x.f, x.id, x.sentAt, x.landsAt, sell, 'you', { mine: 1, icon: x.side === 'good' ? 'crate' : x.w, what: x.side === 'good' ? x.name : WARES[x.w].name, n: x.side === 'good' ? 1 : x.n, from: sell ? 'You' : FX[x.f].short, to: sell ? FX[x.f].short : 'You', credits: sell ? x.credits : -x.credits, lands: x.landsAt });
  }
  if (PAYLOAD.on) for (const p of flyingOf(s)) mine(p.f, p.id, p.sentAt, p.landsAt, true, 'pay', { mine: 1, pay: 1, icon: 'spike', what: PAYLOADS[p.kind].name, n: 1, from: 'You', to: FX[p.f].short, lands: p.landsAt });
  return routes.length ? `<g class="mtraffic">${routes.join('')}${dots.join('')}</g>` : '';
}

// The hover card for a file moving on the map: what it is, how many, where from and to, and for
// hub-to-hub traffic the price gap it's chasing. t: { icon, what, n, from, to, credits?, lands?, lo?, hi? }.
export function packetTipMarkup(t, now = Date.now()) {
  const ware = WARES[t.icon] ? t.icon : null, file = t.pay ? `${(t.what || '').toLowerCase().replace(/\W+/g, '_')}.bin` : `${ware || 'goods'}${t.n > 1 ? '_x' + t.n : ''}.dat`;
  return `<div class="pkt-card${t.pay ? ' pkt-pay' : ''}"><div class="pkt-top">${glyph(t.icon || 'item', 'badge')}<span><b>${esc(t.what)}${t.n > 1 ? ` <small>×${t.n}</small>` : ''}</b><code>${esc(file)}</code></span></div>
    <div class="pkt-route"><span>${esc(t.from)}</span><i>→</i><span>${esc(t.to)}</span></div>
    ${t.lo != null ? `<div class="pkt-row" title="Price a unit: where it's cheap → where it pays">${glyph('credits')}<b>${t.lo}</b><i>→</i><b class="up">${t.hi}</b><small>▲${Math.round((t.hi / Math.max(1, t.lo) - 1) * 100)}%</small></div>` : ''}
    ${t.credits ? `<div class="pkt-row">${glyph('credits')}<b class="${t.credits > 0 ? 'up' : ''}">${t.credits > 0 ? '+' : '−'}${Math.abs(t.credits)}</b></div>` : ''}
    ${t.lands ? `<div class="pkt-row">${glyph('clock')}<b>${fmtTime(Math.max(0, t.lands - now))}</b></div>` : ''}</div>`;
}

// Screen pixels per map unit (app.js sets it from the drawn map): label sizes in map units follow it.
let mapScale = 1;
export const setMapScale = (z) => { const was = mapScale; mapScale = z; return Math.abs(was - z) / was > 0.08; };
// Map filters: any mix of mine · targets · threats (none = everything). Old callers pass one string.
const MAP_FILTERS = [['mine', 'Mine', 'f-mine'], ['targets', 'Targets', 'f-target'], ['threats', 'Threats', 'f-threat']];
const filterList = (f) => (Array.isArray(f) ? f : !f || f === 'all' ? [] : [f]).filter((k) => MAP_FILTERS.some(([x]) => x === k));
export function mapMarkup(s, sel = 'server', view = 'mine', { side = true, pop = false, filter = 'all', list = false, sort = 'status', pickOpen = false } = {}) {
  const none = !sel; // nothing selected (you clicked away): no reticle, and the side card shows your server
  sel ||= 'server';
  filter = filterList(filter);
  // A member's server (or home) shows on the consortium's map, whichever view was asked for.
  const con = !!consortiumOf(s) && (view === 'consortium' || sel === 'roamer' || sel.startsWith('member-') || memberServers(s).some((l) => l.id === sel));
  const { nodes, links } = con ? consortiumLayout(s) : mapLayout(s);
  const find = (id) => nodes.find((n) => n.id === id);
  if (!find(sel)) sel = 'server';
  // A steady scale: the scope is at least this big, so a young network isn't blown up huge.
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const mx = con ? 190 : 130, my = con ? 56 : 52; // the consortium's outer ring carries long labels; hubs sit near the top and bottom edges
  const minX = Math.min(...xs, -250) - mx, maxX = Math.max(...xs, 250) + mx, minY = Math.min(...ys, -240) - my, maxY = Math.max(...ys, 240) + my + 4;
  const deepest = Math.max(1, ...s.locations.map((l) => l.depth || 1));
  const rings = con ? [{ r: RM, t: 'trunk', cls: 'trunk' }] : [{ r: 120, t: 'wall', cls: 'wall' }, ...Array.from({ length: deepest }, (_, i) => ({ r: R1 + i * R2, t: `layer ${i + 1}` }))];
  // A ring's name sits on the ring, near the top right, but clear of every server on the map.
  // A server takes its marker plus the name to its right; the gap is measured between the two boxes.
  const room = (x, y) => Math.min(...nodes.map((n) => Math.hypot(Math.max(x - n.x - 130, 0, n.x - 14 - x - 64), Math.max(y - 12 - n.y - 22, 0, n.y - 14 - y - 2))));
  const ringAt = (r) => {
    let best = null;
    for (let i = 0; i < 90; i++) {
      const d = 44 + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 4; // fan out from 44°
      const x = Math.round(r * Math.cos(d * Math.PI / 180)) + 4, y = -Math.round(r * Math.sin(d * Math.PI / 180)) - 4, k = room(x, y);
      if (k >= 6) return [x, y];
      if (!best || k > best[2]) best = [x, y, k];
    }
    return best;
  };
  const scope = `<g class="mscope">${rings.map((g) => { const [x, y] = ringAt(g.r); return `<circle r="${g.r}" class="mring-range ${g.cls || ''}"/><text text-anchor="start" x="${x}" y="${y}" class="mring-label">${g.t}</text>`; }).join('')}
    <line x1="${minX}" y1="0" x2="${maxX}" y2="0" class="maxis"/><line x1="0" y1="${minY}" x2="0" y2="${maxY}" class="maxis"/></g>`;
  const lines = links.map((k) => {
    const a2 = find(k.from), b2 = find(k.to);
    return `<line x1="${a2.x}" y1="${a2.y}" x2="${b2.x}" y2="${b2.y}" class="mlink ${k.hot ? 'hot' : ''} ${k.ghost ? 'ghost' : ''} ${k.trunk ? 'trunk' : ''}"/>`;
  }).join('');
  // Labels that would overlap: the more important one keeps its label, the other's comes back on
  // hover, selection or zoom. Importance: selected, under threat, a contract or fresh find, an
  // outpost or where you are, then the rest (quiet servers have no label to begin with).
  const crowded = new Set();
  {
    const z = mapScale || 1, CH = (11 * 0.62 + 1) / z, H = 30 / z, boxes = []; // text keeps its on-screen size: its width in map units grows as the map shrinks
    const rank = (n) => { if (n.id === sel) return 0; const tags = mapTags(s, n.loc, nodeState(s, n.loc), openContracts(s).some((c) => c.loc === n.loc.id)); return tags.includes('minor') ? 9 : tags.includes('f-threat') ? 1 : tags.includes('f-target') && !tags.includes(' f-mine') ? 3 : n.loc.outpost?.h || s.run?.loc === n.loc.id ? 2 : 4; };
    const cands = nodes.filter((n) => n.kind === 'location' && n.loc).map((n) => ({ n, r: rank(n) })).filter((c) => c.r < 9).sort((a, b) => a.r - b.r);
    for (const { n } of cands) {
      const p = labelAt(n, 12), w = Math.max(n.loc.name.length, 10) * CH;
      const x0 = n.x + p.x - (p.a === 'end' ? w : p.a === 'middle' ? w / 2 : 0), y0 = n.y + p.y - 11 / z;
      const box = [x0, y0, x0 + w, y0 + H];
      if (boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) crowded.add(n.id); else boxes.push(box);
    }
  }
  const draw = nodes.map((n) => {
    const on = !none && n.id === sel ? ' selected' : '';
    const pick = on ? reticle(n.kind === 'server' ? 13 : 9) : '';
    if (n.kind === 'server') {
      const srv = s.server;
      return `<g class="mnode server${on}" data-select="server" tabindex="0" role="button" aria-label="Your server"><circle r="26" class="mhit"/><circle r="24" class="halo"/><g class="srv-glyph" transform="translate(-14 -14) scale(1.75)">${GLYPHS.integrity}</g>${pick}<text y="38" class="mlabel home" text-anchor="middle">HOME</text>${homeBars(s)}<text y="68" class="msub" text-anchor="middle">${srv.integrity}/${srv.max}</text></g>`;
    }
    if (n.kind === 'zone') {
      const live = liveSpawns(s), here = s.run?.loc === CONFIG.zone.id;
      return `<g class="mnode zone${here ? ' here' : ''}${on}" data-select="${CONFIG.zone.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${CONFIG.zone.name}, rogue server"><circle r="18" class="mhit"/><path d="M0 -9 L8 -4.5 L8 4.5 L0 9 L-8 4.5 L-8 -4.5 Z"/>${live ? `<circle r="2.5" class="zdot"/>` : ''}${pick}${label(n, 10, CONFIG.zone.name, (here ? 'you are here' : live ? `rogue server · ${live} ${live === 1 ? 'virus' : 'viruses'}` : 'rogue server · quiet') + (simOn(s) && inSprawl(s).length ? ` · ${inSprawl(s).length} online` : ''))}</g>`;
    }
    if (n.kind === 'roamer') {
      const r = n.roamer, ang = Math.atan2(n.ty - n.y, n.tx - n.x) * 180 / Math.PI;
      return `<g class="mnode invader travel f-threat${on}" data-select="roamer" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Invasion on the trunk line: ${esc(r.name)}"><circle r="18" class="mhit"/><circle r="13" class="vring"/><path class="vbody" d="M0 -9.5 L2.3 -3.8 L8.1 -4.6 L4.3 0 L8.1 4.6 L2.3 3.8 L0 9.5 L-2.3 3.8 L-8.1 4.6 L-4.3 0 L-8.1 -4.6 L-2.3 -3.8 Z"/><circle r="2.6" class="vcore"/>${pick}${label({ ...n, angle: undefined }, 7, r.name, `lv ${r.level} · hop ${r.hop} · ${fmtLeft(r.left)}`, 'hot')}</g>`;
    }
    if (n.kind === 'member') {
      const raid = consortiumOf(s).raid?.member === n.handle, down = rebooting(s, n.handle);
      const sieges = serversOf(s, n.handle).filter((l) => l.held?.siege).length + (raid ? 1 : 0);
      return `<g class="mnode member${n.online ? ' online' : ''}${sieges ? ' besieged' : ''}${raid ? ' raided' : ''}${down ? ' down' : ''}${on}" data-select="${esc(n.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(n.handle)}'s home server"><circle r="18" class="mhit"/><rect x="-7" y="-7" width="14" height="14" rx="2"/>${n.online ? '<circle r="2.5" class="zdot"/>' : ''}${pick}${label(n, 10, n.handle, `lv ${memberLevel(s, n.handle)} · ${serversOf(s, n.handle).length} ${serversOf(s, n.handle).length === 1 ? 'server' : 'servers'}${raid ? ' · invasion at the wall' : down ? ' · crashed' : sieges ? ' · invasion' : ''}`)}</g>`;
    }
    if (n.kind === 'intrusion') {
      return `<g class="mnode intrusion f-threat${on}" data-select="intrusion" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Intrusion ${esc(n.virus.name)}"><circle r="18" class="mhit"/><circle r="8" class="pulse"/><path d="M0 -6 L6 0 L0 6 L-6 0 Z"/>${pick}${label(n, 8, n.virus.name, n.fighting ? 'fighting' : `lv ${n.virus.level} · at the gate`, 'hot')}</g>`;
    }
    if (n.kind === 'invader') {
      const inv = n.inv, sub = s.degraded && inv.state !== 'travel' ? 'waiting' : inv.state === 'travel' ? `${fmtLeft(inv.left)} out` : inv.state === 'siege' ? `contested ${Math.round(inv.hp * 100)}%` : 'breach';
      const ang = Math.atan2(-n.y, -n.x) * 180 / Math.PI; // it points at home
      return `<g class="mnode invader ${inv.state} f-threat${on}" data-select="invader" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Invasion: ${esc(inv.name)}"><circle r="18" class="mhit"/><circle r="13" class="vring"/><path class="vbody" d="M0 -9.5 L2.3 -3.8 L8.1 -4.6 L4.3 0 L8.1 4.6 L2.3 3.8 L0 9.5 L-2.3 3.8 L-8.1 4.6 L-4.3 0 L-8.1 -4.6 L-2.3 -3.8 Z"/><circle r="2.6" class="vcore"/>${pick}${label({ ...n, angle: undefined }, 7, inv.name, sub, inv.state === 'breach' ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'fleet') {
      const f = n.fleet, ang = Math.atan2(n.ty - n.y, n.tx - n.x) * 180 / Math.PI;
      const sub = f.state === 'travel' ? `${fmtLeft(fleetLeft(s))} out` : `at it · ${fmtLeft(f.siegeLeft)}`;
      const ships = Array.from({ length: f.total }, (_, i) => `<path d="M5 0 L-4 -3.5 L-2 0 L-4 3.5 Z" class="${i < f.ships ? '' : 'gone'}" transform="translate(${(i % 2) * -7 - Math.floor(i / 2) * 3} ${(i - (f.total - 1) / 2) * 6})"/>`).join('');
      return `<g class="mnode fleet ${f.state} f-threat${on}"${f.faction ? ` style="--fc:${FX[f.faction].color}" data-faction="${f.faction}"` : ''} data-select="fleet" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Swarm of ${f.ships}"><circle r="18" class="mhit"/><g transform="rotate(${Math.round(ang)})">${ships}</g>${pick}${label(n, 10, `Swarm ×${f.ships}`, f.faction ? `${FX[f.faction].short} · ${sub}` : sub, f.state === 'siege' ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'hub') {
      const f = n.hub.faction, F = FX[f], t = repTier(s, f);
      return `<g class="mnode hub${hostile(s, f) ? ' hostile' : ''}${offline(s, f) ? ' offline' : ''}${captured(s, f) ? ' yours f-mine' : ''}${lockedDown(s, f) || retakeOf(s)?.f === f ? ' threat f-threat' : ''}${on}" style="--fc:${captured(s, f) ? 'var(--you)' : F.color}" data-select="${esc(n.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(F.name)} hub"><circle r="18" class="mhit"/><path d="M0 -13 L13 0 L0 13 L-13 0 Z" class="hub-frame"/><g class="hub-mark" transform="translate(-8 -8)">${GLYPHS['f-' + f]}</g>${pick}${label(n, 14, F.short, lockedDown(s, f) ? 'lockdown' : retakeOf(s)?.f === f ? `swarm · ${fmtLeft(retakeLeft(s))}` : offline(s, f) ? 'hub · offline' : captured(s, f) ? 'your hub' : `hub · ${t.name}`, lockedDown(s, f) || retakeOf(s)?.f === f ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'hidden') {
      const h = n.hidden, flag = hiddenFlagged(s, h);
      return `<g class="mnode hidden f-target${flag ? ' job' : ''}${on}" data-select="${h.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Unknown server"><circle r="18" class="mhit"/>${arc(8, h.lead / 100, 'lead')}<text class="qmark" text-anchor="middle" y="4">?</text>${pick}${label(n, 9, flag ? 'Flagged' : 'Unknown', `${h.lead ? h.lead + '% traced' : 'pinged'}`, 'dim')}</g>`;
    }
    if (n.kind === 'lead') {
      return `<g class="mnode lead f-target${on}" data-select="${n.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(FAMILIES[n.family].name)} lead"><circle r="18" class="mhit"/>${arc(8, n.progress / 100, 'lead')}${pick}${label(n, 9, `${FAMILIES[n.family].name} lead`, `${Math.min(99, n.progress)}%`, 'dim')}</g>`;
    }
    const l = n.loc, st = nodeState(s, l);
    const taken = takenOf(l), total = takeable(l).length;
    const job = openContracts(s).some((c) => c.loc === l.id);
    const rest = st === 'here' ? 'here' : l.held?.siege ? 'invasion' : l.held?.lockdown ? 'lockdown' : l.held ? l.held.kind : job ? 'contract' : l.outpost?.lockdown ? 'lockdown' : l.outpost?.siege ? 'invasion' : l.outpost?.h ? gauge(stockOf(l), capOf(l)) : l.takenOver ? '' : st === 'done' ? 'clean' : '';
    const op = isOutpost(l) ? (l.outpost?.lockdown ? ' locked' : s.fleet?.target === l.id && s.fleet.state === 'siege' ? ' besieged' : ' outpost') : l.held ? (l.held.siege ? ' besieged' : l.held.lockdown ? ' locked' : ' outpost') : '';
    if (l.rogue) {
      const live = Object.values(l.spawns || {}).filter((x) => x.alive).length;
      return `<g class="mnode rogue${mapTags(s, l, st, job)}${crowded.has(n.id) ? ' crowded' : ''}${st === 'here' ? ' here' : ''}${s.locations.includes(l) && !isLive(s, l) ? ' detached' : ''}${on}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(l.name)}, rogue server"><circle r="18" class="mhit"/><path d="M0 -10 L9 -5 L9 5 L0 10 L-9 5 L-9 -5 Z"/><path d="M-4 -3 L4 3 M4 -3 L-4 3" class="rx"/>${pick}${lvLabel(s, n, 12, l.name, l.level || 1, l.depth || 1, l.occupied ? `rebooting · ${live}` : `${ROGUE.kinds[l.rogue.kind].name.toLowerCase()}${st === 'here' ? ' · here' : live ? ` · ${live} hostile` : ''}`)}</g>`;
    }
    return `<g ${l.faction ? `style="--fc:${FX[l.faction].color}" ` : ''}class="mnode loc ${st}${mapTags(s, l, st, job)}${crowded.has(n.id) ? ' crowded' : ''}${l.faction ? ' fowned' : ''}${l.takenOver ? ' owned' : ''}${s.locations.includes(l) && !isLive(s, l) ? ' detached' : ''}${op}${job ? ' job' : ''}${eventsAt(s, l.id).length ? ' drop' : ''}${on}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(l.name)}"><circle r="18" class="mhit"/>${l.outpost?.h ? `<title>${esc(l.name)} · stockpile ${stockOf(l)}/${capOf(l)}</title>` : ''}${st === 'new' ? '<circle r="11" class="ring"/>' : arc(10, total ? taken / total : 0, st)}<circle r="5" class="core"/>${rotMark(l)}${l.faction ? `<g class="fmark" transform="translate(9 -17) scale(0.62)">${GLYPHS['f-' + l.faction]}</g>` : ''}${dropMark(s, l)}${pick}${lvLabel(s, n, 12, l.name, l.takenOver ? null : l.level || 1, l.depth || 1, rest)}</g>`;
  }).join('');
  const hoverNames = s.settings?.mapNames === 'hover';
  const svg = `<svg class="map-svg${hoverNames ? ' names-hover' : ''}${filter.length ? ' mf' + filter.map((k) => ' mf-' + k).join('') : ''}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" data-vb="${minX} ${minY} ${maxX - minX} ${maxY - minY}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of your server and traced locations">${scope}${lines}${con ? '' : trafficMarkup(s, nodes)}${draw}</svg>`;
  // Top corner: which map, and the map's own controls (names on hover, zoom back out).
  const tabs = `<div class="map-tools"><div class="map-left">${consortiumOf(s) ? `<div class="map-tabs comms-filters" role="group" aria-label="Show"><button type="button" data-mapview="mine" aria-pressed="${!con}">Your network</button><button type="button" data-mapview="consortium" aria-pressed="${con}">${esc(consortiumOf(s).name)}</button></div>` : ''}<div class="map-ctl comms-filters map-mode" role="group" aria-label="View"><button type="button" data-maplist="0" aria-pressed="${!list}">Map</button><button type="button" data-maplist="1" aria-pressed="${list}">List</button></div><details class="map-pick${filter.length ? ' on' : ''}"${pickOpen ? ' open' : ''}><summary data-mapfilter-toggle aria-label="Show">${filter.length ? filter.map((k) => MAP_FILTERS.find(([x]) => x === k)[1]).join(' + ') : 'All'}</summary><div class="map-pick-menu">${MAP_FILTERS.map(([k, l]) => `<label><input type="checkbox" data-mapfilter-check="${k}"${filter.includes(k) ? ' checked' : ''}><span>${l}</span></label>`).join('')}${filter.length ? '<button type="button" data-mapfilter-clear>Show all</button>' : ''}</div></details></div><div class="map-ctl comms-filters"><button type="button" data-run="map names ${hoverNames ? 'on' : 'hover'}" aria-pressed="${!hoverNames}" title="${hoverNames ? 'Names show on hover: click to always show them' : 'Show names only on hover'}">Aa</button><button type="button" data-locate="__sel" title="Zoom to the selected one">${glyph('trace')}</button><button type="button" data-map-zoom="reset" title="Zoom back out (double-click the map too). Scroll to zoom, drag to pan.">⤢</button></div></div>`;
  // pop: the selected node's card, popped up beside the node (app.js places it once the map is drawn).
  const card = pop ? `<div class="map-pop" id="map-pop" data-keep="${esc(sel || '')}" style="visibility:hidden"><button type="button" class="btn small map-pop-x" data-map-pop-close title="Close">×</button>${mapSide(s, sel, find(sel))}</div>` : '';
  // List mode (MOO2's planets list): every server as a row, sortable, the filters apply; the
  // selected one's card sits beside the list.
  if (list && !con) return `<div class="map-page map-list-page"><section class="panel map-canvas map-list">${tabs}${serverList(s, sel, filter, sort)}</section><aside class="map-side">${mapSide(s, sel, find(sel))}</aside></div>`;
  return `<div class="map-page${side ? '' : ' no-side'}"><section class="panel map-canvas">${tabs}${con ? '' : threatRail(s)}${svg}${card}</section>${side ? `<aside class="map-side">${mapSide(s, sel, find(sel))}</aside>` : ''}</div>`;
}
const LIST_COLS = [['name', 'Server'], ['family', 'Family'], ['level', 'Lv'], ['layer', 'Layer'], ['explored', 'Explored'], ['status', 'Status']];
function serverList(s, sel, filter, sort) {
  const [key, dir] = sort.startsWith('-') ? [sort.slice(1), -1] : [sort, 1];
  const rows = (s.locations || []).map((l) => {
    const st = nodeState(s, l), job = openContracts(s).some((c) => c.loc === l.id), tags = mapTags(s, l, st, job);
    const taken = takenOf(l), total = takeable(l).length || 1, o = l.outpost || {};
    const chips = [
      st === 'here' ? '<span class="tag you">here</span>' : '',
      s.fleet?.target === l.id ? '<span class="tag hot">swarm</span>' : '', o.lockdown ? '<span class="tag hot">lockdown</span>' : '',
      s.fleet?.target === l.id ? '<span class="tag hot">swarm</span>' : '',
      job ? `<span class="ls-job" title="A contract">${glyph('contract')}</span>` : '',
      l.fresh && l.detached ? '<span class="tag">found</span>' : l.detached ? '<span class="tag dim">detached</span>' : '',
      isOutpost(l) ? `<span class="tag you" title="Outpost: ${esc(buildingsOf(l).map((id) => BUILDINGS[id].name).join(', '))}">${glyph('module')}${buildingsOf(l).length}/${slotsOf(l)}</span>` : l.takenOver ? '<span class="tag dim">yours</span>' : '',
      l.rogue ? `<span class="tag dim">${esc(ROGUE.kinds[l.rogue.kind].name.toLowerCase())}</span>` : '',
    ].join('');
    const rank = tags.includes('f-threat') ? 0 : st === 'here' ? 1 : job || (l.fresh && l.detached) ? 2 : isOutpost(l) ? 3 : tags.includes('minor') ? 5 : 4;
    return { l, tags, chips, rank, explored: taken / total, taken, total };
  }).filter((r) => !filter.length || filter.some((k) => r.tags.includes(MAP_FILTERS.find(([x]) => x === k)[2])));
  const val = { name: (r) => r.l.name, family: (r) => r.l.family, level: (r) => r.l.level || 1, layer: (r) => r.l.depth || 1, explored: (r) => r.explored, status: (r) => r.rank };
  rows.sort((a, b) => { const x = val[key](a), y = val[key](b); return (x < y ? -1 : x > y ? 1 : a.l.name < b.l.name ? -1 : 1) * dir; });
  const head = LIST_COLS.map(([k, label]) => `<button type="button" class="sl-h${k === key ? ' on' : ''}" data-msort="${k === key && dir === 1 ? '-' + k : k}">${label}${k === key ? (dir === 1 ? ' ▴' : ' ▾') : ''}</button>`).join('');
  const body = rows.map((r) => { const l = r.l, gap = (l.level || 1) - hackerLevel(s); return `<button type="button" class="sl-row${l.id === sel ? ' on' : ''}${r.tags.includes('minor') ? ' minor' : ''}" data-select="${esc(l.id)}">
      <span class="sl-name">${l.faction ? fIcon(l.faction) : ''}<b>${esc(l.name)}</b></span>
      <span class="sl-fam">${glyph(l.family)}${esc(FAMILIES[l.family]?.name || '')}</span>
      <span class="sl-lv ${conClass(gap)}">${l.level || 1}</span>
      <span class="sl-num">${l.depth || 1}</span>
      <span class="sl-exp"><span class="ld-bar"><span style="width:${Math.round(r.explored * 100)}%"></span></span><small>${r.taken}/${r.total}</small></span>
      <span class="sl-status">${r.chips}${locBtn(l.id)}</span></button>`; }).join('');
  return `<div class="server-list"><div class="sl-head">${head}</div><div class="sl-body">${body || '<p class="quiet">None.</p>'}${listHubs(s, sel, filter)}${listLeads(s, sel, filter)}</div></div>`;
}
// Locate: back to the map, centred and zoomed on it (app.js).
const locBtn = (id) => `<span class="sl-loc" role="button" tabindex="0" data-locate="${esc(id)}" title="Show it on the map">${glyph('trace')}</span>`;
// The hubs you've found, as rows: the faction, its level, how it stands with you.
function listHubs(s, sel, filter) {
  const hubs = hubsOf(s).filter((h) => !filter.length || (filter.includes('mine') && captured(s, h.faction)) || (filter.includes('threats') && (lockedDown(s, h.faction) || retakeOf(s)?.f === h.faction)));
  if (!hubs.length) return '';
  return `<h4 class="sl-sec">Hubs</h4>${hubs.map((h) => { const f = h.faction, chips = [captured(s, f) ? '<span class="tag you">yours</span>' : '', hostile(s, f) ? '<span class="tag hot">hostile</span>' : '', offline(s, f) ? '<span class="tag dim">offline</span>' : '', lockedDown(s, f) ? '<span class="tag hot">lockdown</span>' : '', retakeOf(s)?.f === f ? '<span class="tag hot">swarm</span>' : ''].join('');
    return `<button type="button" class="sl-row${h.id === sel ? ' on' : ''}" data-select="${esc(h.id)}"><span class="sl-name">${fIcon(f)}<b>${esc(h.name)}</b></span><span class="sl-fam">${esc(FX[f].short)}</span><span class="sl-lv">${h.level}</span><span class="sl-num">—</span><span class="sl-exp"><small>${esc(repTier(s, f).name)}</small></span><span class="sl-status">${chips}${locBtn(h.id)}</span></button>`; }).join('')}`;
}
// Traces in progress: a family's lead, and the unknown servers you can see.
function listLeads(s, sel, filter) {
  if (filter.length && !filter.includes('targets')) return '';
  const fams = Object.entries(s.leadProgress || {}).filter(([f, n]) => FAMILIES[f] && n > 0).map(([f, n]) => ({ id: 'lead-' + f, name: `${FAMILIES[f].name} lead`, fam: f, pct: n, depth: '1', flag: false }));
  const nodes = shownHidden(s).map((n) => ({ id: n.id, name: `? past ${s.locations.find((l) => l.id === n.via)?.name || '?'}`, fam: n.pinged || n.seen ? n.family : null, pct: n.lead, depth: String(n.depth), flag: hiddenFlagged(s, n) }));
  const rows = [...fams, ...nodes].sort((a, b) => b.pct - a.pct);
  if (!rows.length) return '';
  return `<h4 class="sl-sec">Leads and unknown servers</h4>${rows.map((r) => `<button type="button" class="sl-row${r.id === sel ? ' on' : ''}" data-select="${esc(r.id)}"><span class="sl-name">${glyph('trace')}<b>${esc(r.name)}</b></span><span class="sl-fam">${r.fam ? glyph(r.fam) + esc(FAMILIES[r.fam]?.name || '') : '?'}</span><span class="sl-lv">—</span><span class="sl-num">${r.depth}</span><span class="sl-exp"><span class="ld-bar"><span style="width:${Math.min(100, r.pct)}%"></span></span><small>${Math.floor(r.pct)}%</small></span><span class="sl-status">${r.flag ? `<span class="ls-job" title="A contract">${glyph('contract')}</span>` : ''}${locBtn(r.id)}</span></button>`).join('')}`;
}
// The map's selection card on its own (the sidebar carries it when it's on).
export function mapSelection(s, sel = 'server', view = 'mine') {
  const con = !!consortiumOf(s) && (view === 'consortium' || sel === 'roamer' || sel.startsWith('member-') || memberServers(s).some((l) => l.id === sel));
  const { nodes } = con ? consortiumLayout(s) : mapLayout(s);
  const node = nodes.find((n) => n.id === sel) || nodes.find((n) => n.id === 'server');
  return mapSide(s, node?.id || 'server', node);
}

// What reaching a server level adds, in words: "a service slot", "an outpost slot"…
export function serverGains(lvl) {
  const out = [];
  if (ports(lvl) > ports(lvl - 1)) out.push('a service slot');
  if (SERVER.daemonSlotsAt.includes(lvl)) out.push('a daemon slot');
  if (OUTPOST.bandwidth(lvl) > OUTPOST.bandwidth(lvl - 1)) out.push('an outpost slot');
  if (lvl === ARCH_LEVEL) out.push('a choice of architecture');
  return out;
}
const andList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0] || '');
// The next server level that adds something, and what.
function serverNext(lvl) {
  for (let l = lvl + 1; l <= SERVER.maxLevel; l++) { const g = serverGains(l); if (g.length) return `Level ${l} adds ${andList(g)}.`; }
  return '';
}
export const serverLevelText = (lvl, max) => `Your server levels up from all the XP you earn. Its max Integrity is now ${max}.${serverGains(lvl).length ? ` This level adds ${andList(serverGains(lvl))}.` : ''}`;

// Server level: shared by everyone on the server. Defending it and banking loot raise it.
function serverCard(s) {
  const p = serverProgress(s);
  const opens = p.next && SERVER.daemonSlotsAt.includes(p.level + 1) ? ['a daemon slot'] : [];
  return `<div class="lvl-row" title="The server gets every point of XP your classes earn"><span class="lvl-badge">Server Lv ${p.level}</span>${p.next ? `<span class="lvl-bar"><span style="width:${(p.xp / p.next) * 100}%"></span></span><small>${p.xp}/${p.next} XP</small>` : '<small>max level</small>'}</div>`;
}

// An event on a server (events.mjs): a mark on the map node, and what's happening on its card.
// Root access (root.mjs): five pips, the perks on hover; and the process a log rotation brought in.
const rootPips = (l) => { const r = rootOf(l), p = rootProgress(l); return `<span class="root-pips" title="${esc(Array.from({ length: ROOT.max }, (_, i) => `${i < r ? '■' : '□'} Root ${i + 1}: ${ROOT_PERKS[i + 1]}`).join('\n') + (p ? `\n\n${p.have}/${p.need} processes cleared for Root ${r + 1}` : ''))}">${'■'.repeat(r)}<i>${'□'.repeat(ROOT.max - r)}</i></span>`; };
const rotMark = (l) => { const p = procOf(l); return p ? `<g class="rotmark${p.rare ? ' rare' : ''}" transform="translate(-13 -12)"><title>${esc(`${p.rare ? 'Rare virus' : 'Log rotation'}: ${p.name} lv ${p.level} in ${p.room}`)}</title><text>${p.rare ? '★' : '↻'}</text></g>` : ''; };
const hm = (ms) => (ms >= 3600000 ? `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m` : fmtLeft(ms));
const rotLine = (s, l) => {
  if (!rootOf(l)) return '';
  const p = procOf(l), next = l.root?.nextAt, now = Date.now();
  if (p) return `<p class="svc-line"><span class="tag ${p.rare ? 'hot' : 'you'}">${p.rare ? '★' : '↻'} ${esc(p.name)}</span> ${levelTag(s, p.level, `Lv ${p.level}`)} · ${esc(p.room)}${p.until ? ` · ${hm(p.until - now)}` : ''}</p>`;
  return next ? `<p class="svc-line dim" title="Its logs rotate every ${ROOT.rotateMs / 3600000} hours: a fresh virus, and a new cache">↻ ${hm(Math.max(0, next - now))}</p>` : '';
};
const dropMark = (s, l) => (eventsAt(s, l.id).length ? '<g class="dropmark" transform="translate(12 -12) scale(1.4)"><path d="M0 4 L0 -3 M-3 -5 Q0 -8 3 -5 M-5 -7 Q0 -12 5 -7"/></g>' : '');
// An event on this server (events.mjs): what's happening, how long it stays, and a way in.
function dropLine(s, l) {
  if (!l) return '';
  return eventsAt(s, l.id).map((ev) => { const c = EVENT_CARDS[ev.card], busy = active(s) || s.run;
    return `<div class="event-line"><p class="op-hint"><span class="tag tag-drop">${esc(c.name)} · ${eventMinutes(ev)} min</span> ${esc(eventText(s, ev))}</p>${c.fight ? `<div class="row"><button type="button" class="btn primary" data-command="event fight ${ev.id}" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Intercept ${esc(ev.name)} · Lv ${ev.level}</button><small class="quiet">${esc(c.reward(ev))}</small></div>` : ''}</div>`; }).join('');
}

// In a consortium, your wall meets invaders while you're logged off: what it stops.
// The wall as a server-card row: a bar of how well it covers the highest level your traced servers
// send (teal: it stops them; amber: they'd be contested; red: they'd break through), and the level it stops.
function wallRow(s, icon, label, b, tipExtra = '') {
  const top = threatTop(s);
  const cover = top ? Math.min(1, b.blocks / top) : 1, state = !top || b.blocks >= top ? 'ok' : b.holds >= top ? 'mid' : 'low';
  const tip = `Firewall lv ${b.blocks}: stops invasions up to level ${b.blocks}${b.holds > b.blocks ? `, contests ${b.blocks + 1}–${b.holds}` : ''}${top ? `. Your servers send up to level ${top}` : ''}.${tipExtra}`;
  return srvLine(icon, label, `<span class="srv-bar wall ${state}"><span style="width:${(cover * 100).toFixed(0)}%"></span></span>`, state === 'ok' ? '<small>safe</small>' : `<small>vuln lv</small> ${b.blocks + 1}+`, tip);
}
function awayLine(s) {
  if (!consortiumOf(s)) return '';
  if (s.degraded) return srvLine('clock', 'Away', '<span class="tag warn">Rebooting</span>', '', 'No wall until it is back up');
  return wallRow(s, 'clock', 'Away', wallBands(s, wallRating(s)), ` While you're logged off (consortium bonus included); a crash reboots your server for ${CONSORTIUM.rebootMs / 3600000} hours.`);
}

// The consortium (consortium.mjs) on a server card: whose it is, a siege to break, or shared ground.
function consortiumLine(s, l) {
  const c = consortiumOf(s);
  if (!c) return '';
  if (l.trunk) return `<p class="svc-line"><span class="tag tag-con">${esc(c.name)}</span> trunk server: the consortium's own</p>`;
  if (l.member) {
    const sg = l.held?.siege, ld = l.held?.lockdown, busy = active(s) || s.run;
    if (ld) return `<p class="svc-line"><span class="tag tag-con">${esc(l.member)}'s</span> ${esc(l.held.kind)} outpost <span class="tag hot">lockdown · ${fmtTime(ld.left)}</span> pays nothing</p><div class="row"><button type="button" class="btn primary" data-command="consortium defend ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Retake for a bounty</button></div>`;
    return `<p class="svc-line"><span class="tag tag-con">${esc(l.member)}'s</span>${l.held ? ` ${esc(l.held.kind)} outpost · ${l.held.siege ? 'pays nothing during the invasion' : `pays you ${dividendOf(s, l).toFixed(2)} ${l.held.kind === 'scraper' ? 'finds' : esc(MATERIALS[codeOf(l.family)].name)}/h · ${Math.floor(l.held.share || 0)} waiting`}` : ''}${sg ? ` <span class="tag hot">invasion · ${fmtLeft(sg.left)}</span>` : ''}</p>${sg ? `<div class="row"><button type="button" class="btn primary" data-command="consortium defend ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Defend for a bounty</button></div>` : ''}`;
  }
  return isGround(s, l) ? `<p class="svc-line"><span class="tag tag-con">${esc(c.name)}</span> shared with the consortium</p>` : '';
}

// The rogue server's card: the main thing to do, so it also leads the server card.
function zoneCard(s) {
  const here = s.run?.loc === CONFIG.zone.id, sig = signalNow(s), max = maxSignal(s), need = Math.ceil(max * CONFIG.zone.minSignal);
  const why = active(s) ? 'Finish the fight first' : s.run ? 'Jack out first' : relockLeft(s.zone) ? `Reconnect in ${relockLeft(s.zone)}s` : sig < need ? `Needs ${need} Signal` : '';
  return `<section class="card zone-card"><h2>Rogue server</h2><h1>${CONFIG.zone.name}</h1>
    <div class="stats">${stat('Hostiles', `${liveSpawns(s)}/${zoneRooms().length}`)}${stat('Levels', `<b class="${hackerLevel(s) > CONFIG.zone.maxLevel + 4 ? 'con-gray' : hackerLevel(s) > CONFIG.zone.maxLevel ? 'con-orange' : 'con-yellow'}" title="${hackerLevel(s) > CONFIG.zone.maxLevel ? 'You\'re outgrowing it: its kills pay less every level' : 'Its viruses keep up with you to this level'}">Lv 1–${CONFIG.zone.maxLevel}</b>`)}</div>
    <div class="row">${here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${CONFIG.zone.id}" ${why ? `disabled title="${esc(why)}"` : ''}>Connect</button>`}${why && !here ? `<small class="svc-line">${esc(why)}</small>` : ''}</div></section>`;
}
// The server card's lines: icon and name, then what it is (a bar or pips), then its number.
const srvLine = (icon, name, body, value, tip = '') => `<div class="srv-line"${tip ? ` title="${esc(tip)}"` : ''}><span class="srv-k">${glyph(icon)}${esc(name)}</span><span class="srv-v">${body}</span><b class="srv-n">${value}</b></div>`;
// The service slots, left to right: what runs in each (icon and version), what's installing, then free slots.
function svcStrip(s) {
  const running = Object.entries(s.services || {}).map(([id, v]) => `<span class="svc-tile on" title="${esc(SERVICES[id].name)} v${v}">${glyph(id)}<small>v${v}</small></span>`);
  const inst = s.install && !serviceVersion(s, s.install.id) ? [`<span class="svc-tile busy" title="${esc(SERVICES[s.install.id].name)}: installing">${glyph(s.install.id)}<small>…</small></span>`] : [];
  const free = Array.from({ length: Math.max(0, portCount(s) - running.length - inst.length) }, () => '<span class="svc-tile free" title="Free slot"></span>');
  return [...running, ...inst, ...free].join('');
}
function mapSide(s, sel, node) {
  const e = gateOf(s), srv = s.server;
  const busy = active(s) || s.run;
  const alertCard = () => {
    if (!e) return '';
    const v = e.virus, f = FAMILIES[v.family], m = MUTATIONS[v.mutation];
    return `<section class="card alert"><h2>${e.phase === 'active' ? 'Fighting' : 'At the gate'}</h2><h1>${esc(v.name)}</h1>
      <p>${levelTag(s, v.level)} ${esc(f.name)}${m ? ` <span class="tag tag-mut" data-mut="${v.mutation}" title="${esc(m.rule)}">${esc(m.name)}</span>` : ''}${strainTags(s, v)}</p>
      <div class="row">${e.phase === 'active' ? btn('combat', 'Back to the fight', true) : s.run ? '<span class="tag dim">waiting</span>' : btn('engage', 'Engage', true)}</div></section>`;
  };
  if (!node || node.kind === 'server') {
    const r = s.reports.findLast((x) => x.mode !== 'run');
    const upkeep = [];
    if (srv.integrity > 0 && srv.integrity < srv.max) upkeep.push(btn('repair', `Repair (${topUpCost(s, 'server')}c)`));
    if (!s.run && !busy && topUpCost(s, 'signal')) upkeep.push(btn('top up', `Top up Signal (${topUpCost(s, 'signal')}c)`));
    if (srv.integrity <= 0) upkeep.push(btn('developer reboot', 'Reboot (testing)', true));
    const runCard = s.run ? `<section class="card lesson"><h2>On a run</h2><h1>${esc(currentLocation(s).name)}</h1><p>Signal ${s.run.integrity}/${s.run.max} · ${s.run.pack.length} unbanked.</p><div class="row">${btn('net', 'Back to the run', true)}</div></section>` : '';
    const occ = s.occupation && !s.occupation.occupied.cleared ? mapSide(s, 'home', { kind: 'location', loc: s.occupation }) : '';
    return `${runCard}${alertCard()}${occ}
      <section class="card srv-card"><h2>Your server</h2>
        ${(() => { const sp = serverProgress(s);
          return srvLine('integrity', 'Server', `<span class="srv-bar xp"><span style="width:${sp.next ? (sp.xp / sp.next) * 100 : 100}%"></span></span>`, `<small>Lv</small> ${sp.level}`, `Server level ${sp.level}${sp.next ? `: ${sp.xp}/${sp.next} XP` : ' (max)'}`); })()}
        ${srvLine('integrity', 'Integrity', `<span class="srv-bar hp ${srv.integrity / srv.max <= 0.3 ? 'low' : srv.integrity / srv.max <= 0.6 ? 'mid' : ''}"><span style="width:${(srv.integrity / srv.max) * 100}%"></span></span>`, `${srv.integrity}<small>/${srv.max}</small>`)}
        ${s.degraded ? srvLine('firewall', 'Firewall', '<span class="tag warn">down</span>', '', 'Your wall is down while the server is degraded') : wallRow(s, 'firewall', 'Firewall', wallBands(s))}
        ${degradedMarkup(s)}${awayLine(s)}
        <div class="srv-svc"><div class="srv-svc-head"><span>${glyph('node')}Services</span><small>${portsUsed(s)}/${portCount(s)}</small></div><div class="svc-strip">${svcStrip(s)}</div></div>
        ${!MEMORY.on ? '' : srvLine('memory', 'Memory', '', `${Math.max(0, memoryCap(s) - liveCount(s))}<small>/${memoryCap(s)} free</small>`, `${liveCount(s)} servers on your network`)}
        ${srvLine('router', 'Bandwidth', '', `${bandwidthUsed(s)}<small>/${bandwidth(s)}</small>`, 'What your buildings take across your network, of how much you have. It grows with your server level.')}
        ${srvLine('salvage', 'Salvage', '', `${s.salvage.length}`)}
        ${s.install ? `<div class="install mini"><div class="install-top"><b>${glyph(s.install.id)}${esc(SERVICES[s.install.id].name)} v${s.install.v}</b><span>${fmtTime(s.install.doneAt - Date.now())}</span></div><div class="install-bar"><span style="width:${Math.min(100, Math.max(0, ((Date.now() - s.install.startedAt) / (s.install.doneAt - s.install.startedAt)) * 100))}%"></span></div>${buyoutBtn(s, 'buyout', installBuyout(s))}</div>` : ''}
        ${s.invasion ? `<div class="invader-line ${s.invasion.state}"><b>${esc(s.invasion.name)}</b>${levelTag(s, s.invasion.level)}<span>${esc(invaderShort(s))}</span></div>${s.invasion.state !== 'travel' ? `<div class="row">${jackInButton(invaderStatus(s))}</div>` : ''}` : ''}
        <div class="row">${btn('server', 'Services')}${upkeep.join('')}</div>
        ${globalThis.location?.search?.includes('dev') ? `<details><summary>Test intrusions</summary><div class="row" style="margin-top:8px">${btn('encounter cryptjack', 'CRYPTJACK')}${btn('encounter splinter', 'SPLINTER')}${btn('encounter ghostroot', 'GHOSTROOT')}</div></details>` : ''}
      </section>`;
  }
  if (node.kind === 'zone') return zoneCard(s) + alertCard();
  if (node.kind === 'hub') return hubCard(s, node.hub.faction);
  if (node.kind === 'roamer') {
    const r = node.roamer;
    return `<section class="card alert"><h2>Invasion on the trunk line · hop ${r.hop} of ${CONSORTIUM.roam.hops}</h2><h1>${esc(r.name)}</h1>
      <p>${levelTag(s, r.level)} ${esc(FAMILIES[r.family].name)} · from ${esc(r.fromName)}</p>
      <div class="stats">${stat('Arrives in', fmtLeft(r.left))}${stat('Bounty', `×${1 + CONSORTIUM.roam.bounty * r.hop}`)}</div>
      <div class="row"><button type="button" class="btn primary" data-command="consortium intercept" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Intercept</button></div></section>`;
  }
  if (node.kind === 'member') {
    const h = node.handle, p = profileOf(h), c = consortiumOf(s), mine = serversOf(s, h);
    return `<section class="card"><h2>Home server · ${esc(c.name)}</h2><h1>${esc(h)}</h1>
      <p>${esc(ARCHETYPES[p.cls].name)} · ${node.online ? '<span class="tag tag-con">online</span>' : '<span class="tag dim">offline</span>'}${c.founder === h ? ' <span class="tag">founder</span>' : ''}</p>
      <div class="stats">${stat('Servers', mine.length)}${stat('Outposts', mine.filter((l) => l.held).length)}${stat('Rogue', mine.filter((l) => l.rogue).length)}${stat('Outposts pay you', `${Math.round(CONSORTIUM.dividend.share * 100)}%`)}</div>
      ${mine.map((l) => `<p class="svc-line"><button type="button" class="act" data-select="${esc(l.id)}">${esc(l.name)}</button> ${l.rogue ? 'rogue' : l.held ? esc(l.held.kind) + ' outpost' : 'traced'} · lv ${l.level}${l.held?.siege ? ' <span class="tag hot">invasion</span>' : ''}</p>`).join('')}
      ${consortiumOf(s).raid?.member === h ? `<p class="svc-line"><span class="tag hot">Invasion</span> ${esc(consortiumOf(s).raid.name)} lv ${consortiumOf(s).raid.level} at their wall · ${fmtLeft(consortiumOf(s).raid.left)}</p><div class="row"><button type="button" class="btn primary" data-command="consortium defend ${esc(h)}" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Defend their wall</button></div>` : ''}
      ${rebooting(s, h) ? '<p class="svc-line"><span class="tag warn" title="Crashed: their server is on the map below them, open to clear. Their outposts pay nothing meanwhile.">Crashed</span></p>' : ''}</section>`;
  }
  if (node.kind === 'intrusion') return alertCard();
  if (false) {
    const here = s.run?.loc === CONFIG.zone.id, sig = signalNow(s), max = maxSignal(s), need = Math.ceil(max * CONFIG.zone.minSignal);
    const why = active(s) ? 'Finish the fight first' : s.run ? 'Jack out first' : sig < need ? `Needs ${need} Signal` : '';
    return `${alertCard()}<section class="card"><h2>Rogue server</h2><h1>${CONFIG.zone.name}</h1>
      <div class="stats">${stat('Hostiles', `${liveSpawns(s)}/${zoneRooms().length}`)}${stat('Signal', `${here ? s.run.integrity : sig}/${max}`)}</div>
      <div class="row">${here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${CONFIG.zone.id}" ${why ? `disabled title="${esc(why)}"` : ''}>Connect</button>`}</div></section>`;
  }
  if (node.kind === 'intrusion') return alertCard();
  if (node.kind === 'invader') return invaderCard(s);
  if (node.kind === 'fleet') return fleetCard(s);
  if (node.kind === 'hidden') {
    const h = node.hidden, via = s.locations.find((x) => x.id === h.via), flag = hiddenFlagged(s, h), kit = kitOf(s);
    const job = openContracts(s).find((c) => c.hidden === h.id && !c.loc);
    return `<section class="card${flag ? ' alert' : ''}"><h2>Unknown server · layer ${h.depth}</h2><h1>?</h1>
      <p class="svc-line">past ${esc(via?.name || '?')} · signal <span class="sigbars">${'▮'.repeat(h.signal)}${'▯'.repeat(5 - h.signal)}</span></p>
      <p class="svc-line">${h.pinged || h.seen ? `<span class="tag fam-tag" title="Its virus family: kills of this family trace it once a relay pings it">${glyph(FAM_GLYPH[h.family] || 'kill')}${esc(FAMILIES[h.family]?.name || h.family)}</span>` : `<span class="tag dim" title="A relay on ${esc(via?.name || 'the server next to it')} reads its family (so does an invader from it)">${glyph('kill')}family ?</span>`}</p>
      ${flag && job ? `<p class="svc-line"><span class="tag">Contract</span> ${esc(contractTitle(s, job))}</p>` : ''}
      <div class="lvl-row"><span class="lvl-bar"><span style="width:${h.lead}%"></span></span><small>${h.lead}% traced</small></div>
      ${traceWays(s, h, via, kit)}
      ${kit.injector ? `<div class="row"><button type="button" class="btn" data-command="use injector ${h.id}">${glyph('injector')}Trace injector · ${kit.injector}</button></div>` : ''}</section>`;
  }
  if (node.kind === 'lead') {
    const f = FAMILIES[node.family];
    return `<section class="card"><h2>Lead</h2><h1>${esc(f.name)} · ${node.progress}%</h1><div class="lvl-row"><span class="lvl-bar"><span style="width:${Math.min(100, node.progress)}%"></span></span></div><p class="op-hint">This traces the server that sends ${esc(f.name.toLowerCase())} viruses. Each one you kill fills it, and at 100% that server shows up on your map.</p></section>`;
  }
  const l = node.loc, st = nodeState(s, l);
  // A server you found but never connected: Connect asks first, showing the memory it takes.
  if (l.fresh && l.detached && s.locations.includes(l)) {
    const j = joinCost(s, l), asking = memAsk === l.id, after = j.used + j.add;
    const pips = memPips(j);
    const why = busy ? 'Finish what you are doing first' : relockLeft(l) ? 'Still tracing your last connection' : !j.fits ? 'Not enough memory: detach another server first' : '';
    return `<section class="card mem-card${asking ? ' asking' : ''}"><h2>${l.depth > 1 ? `Layer ${l.depth}` : 'Origin'} · found</h2><h1>${esc(l.name)}</h1>
      <p>${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)}${l.faction ? ` · <span class="tag" style="--fc:${FX[l.faction].color}">${esc(FX[l.faction].short)}</span>` : ''}${l.rogue ? ' · <span class="tag hot">rogue</span>' : ''}</p>
      <div class="srv-slots">${pips}</div>
      ${asking
        ? `<div class="mem-ask"><div class="row"><button type="button" class="btn primary" data-mem-yes="${esc(l.id)}" ${why ? `disabled title="${esc(why)}"` : `title="Joins your network: uses ${j.add} memory"`}>${glyph('memory')}Connect · +${j.add}</button><button type="button" class="btn" data-mem-no>Cancel</button></div></div>`
        : `<div class="row"><button type="button" class="btn primary" data-mem-ask="${esc(l.id)}" ${why && why !== 'Not enough memory: detach another server first' ? `disabled title="${esc(why)}"` : `title="Uses ${j.add} memory"`}>Connect</button></div>`}</section>`;
  }
  // Memory (memory.mjs): a detached server is frozen; its card is just that and Attach.
  if (s.locations.includes(l) && !isLive(s, l)) {
    const up = l.detached ? null : (() => { let p = l; while (p && !p.detached) p = s.locations.find((x) => x.id === p.parent); return p; })();
    return `<section class="card mem-card"><h2>${l.depth > 1 ? `Layer ${l.depth}` : 'Origin'} · detached</h2><h1>${esc(l.name)}</h1>
      <p>${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)}${isOutpost(l) ? ` · ${glyph('module')}outpost frozen` : ''}</p>
      <div class="srv-slots">${memPips(joinCost(s, l))}</div>
      <div class="row">${up ? `<button type="button" class="btn" data-select="${esc(up.id)}">${esc(up.name)} is detached</button>` : `<button type="button" class="btn primary" data-command="attach ${esc(l.id)}" ${busy || s.server.credits < memoryCost(l) || !joinCost(s, l).fits ? 'disabled' : ''} title="${!joinCost(s, l).fits ? 'Not enough free memory: detach another server first' : 'Back on your network, as it was'}">${glyph('credits')}Attach · ${memoryCost(l)}</button>`}</div></section>`;
  }
  if (l.occupied) {
    const live = Object.values(rogueSpawns(s, l)).filter((x) => x.alive).length;
    return `<section class="card alert"><h2>${l.member ? `${esc(l.member)}'s server` : 'Your server'} · rebooting</h2><h1>${esc(l.name)}</h1>
      <p>${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)} · occupied</p>
      <div class="stats">${stat('Viruses', `${live}/${rogueRooms(l).length}`)}${stat('Back up in', fmtTime(l.member ? l.occupied.left : degradedLeft(s)))}</div>
      <p class="svc-line"><span class="tag warn" title="Clear every folder to bring it back up${l.member ? ' (a bounty)' : ''}">Crashed</span></p>
      <div class="row">${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relockLeft(l) ? 'disabled title="Still tracing your last connection"' : ''}>Connect</button>`}</div></section>`;
  }
  if (l.rogue) {
    const k = ROGUE.kinds[l.rogue.kind], live = Object.values(rogueSpawns(s, l)).filter((x) => x.alive).length;
    return `<section class="card"><h2>${l.trunk ? 'Trunk server' : l.member ? `${esc(l.member)}'s rogue server` : 'Rogue server'}${l.depth > 1 ? ` · layer ${l.depth}` : ''}</h2><h1>${esc(l.name)}</h1>
      <p>${levelTag(s, (l.level || 1) + (l.rogue.kind === 'pit' ? ROGUE.pitLevels : 0))} <span class="tag tag-rogue" title="${esc(k.rule)}">${esc(k.name)}</span>${l.rogue.kind === 'nest' ? ` ${esc(FAMILIES[l.family].name)}` : ''}</p>
      <div class="stats">${stat('Hostile', `${live}/${rogueRooms(l).length}`)}${stat('Runs', l.runs || 0)}</div>
      <p class="svc-line"><span class="tag dim" title="Can't be taken over; never sends invasions">wild</span></p>
      ${consortiumLine(s, l)}
      <div class="row">${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relockLeft(l) ? `disabled title="Still tracing your last connection"` : ''}>Connect</button>`}${!l.member && !l.trunk && s.locations.includes(l) && MEMORY.on && !freeOfMemory(l) ? `<button type="button" class="btn small mem-x" data-command="detach ${esc(l.id)}" data-confirm="Click again to detach" ${busy ? 'disabled' : ''} title="Free a memory slot. Frozen until you attach it again.">${glyph('memory')}Detach · ${memoryCost(l)}</button>` : ''}${st !== 'here' && relockLeft(l) ? `<small class="svc-line">Reconnect in ${relockLeft(l)}s</small>` : ''}</div></section>`;
  }
  const layout = layoutName(l);
  const guard = Object.keys(l.state.cleared).length ? 'guard beaten' : 'guarded';
  const taken = takenOf(l), total = takeable(l).length;
  const parent = l.parent && s.locations.find((x) => x.id === l.parent);
  return `<section class="card ${st === 'new' ? 'alert' : ''}"><h2>${l.member ? `${esc(l.member)}'s server` : l.depth > 1 ? `Layer ${l.depth}` : 'Origin'} · ${esc(FAMILIES[l.family].name)}</h2><h1>${esc(l.name)}</h1>
    <p>${levelTag(s, l.level || 1)} · ${esc(layout)}${siteLabel(l) ? ` <span class="tag tag-site" title="${esc(siteLabel(l).rule)}">${esc(siteLabel(l).name)}</span>` : ''}${QUIRKS[l.quirk] ? ` <span class="tag tag-quirk" data-quirk="${l.quirk}" title="${esc(QUIRKS[l.quirk].rule)}">${esc(QUIRKS[l.quirk].name)}</span>` : ''}</p>
    <div class="stats">${stat('Files', `${taken}/${total}`)}${l.takenOver ? stat('Root', rootPips(l)) : stat('Guard', Object.keys(l.state.cleared).length ? 'beaten' : 'up')}${stat('Runs', l.runs || 0)}</div>
    ${openContracts(s).filter((c) => c.loc === l.id).map((c) => `<p class="svc-line"><span class="tag${c.offBooks ? ' hot' : ''}">Contract</span> ${esc(contractTitle(s, c))}</p>`).join('')}
    ${parent ? `<p class="svc-line">via ${esc(parent.name)}</p>` : ''}
    ${l.passwordKnown ? `<p class="svc-line">key <code>${esc(l.password)}</code></p>` : ''}
    ${l.relay ? '<p class="svc-line"><span class="tag you">Relay up</span></p>' : ''}
    ${rotLine(s, l)}
    ${consortiumLine(s, l)}
    ${l.faction ? `<p class="svc-line fline" style="--fc:${FX[l.faction].color}">${fIcon(l.faction)}<b>${esc(FX[l.faction].short)}</b> runs it · beating its Resident takes it: ${esc(FX[l.faction].short)} −${OWNED.takeoverHit}${FX[l.faction].rivals.length ? `, ${FX[l.faction].rivals.map((r) => esc(FX[r].short)).join(' and ')} +${Math.round(OWNED.takeoverHit * 0.5)}` : ''}</p>` : ''}
    ${dropLine(s, l)}
    ${outpostCard(s, l)}
    ${l.takenOver && !l.relay && !kitOf(s).relay ? `<p class="op-hint">${boardOpen(s) ? knowsPlan(s, 'relay') ? 'You can install a relay here once you have one. Craft one on the Craft page, or buy one in Halcyon\'s store.' : 'You can install a relay here once you have one. Buy one in Halcyon\'s store, or earn one from a contract. Some contracts pay the Relay plan, so you can craft your own.' : 'You can install a relay here once you have one. Halcyon Mutual sells them once you start working for them.'}</p>` : ''}
    <div class="row">${l.takenOver && !l.relay ? `<button type="button" class="btn" data-command="relay ${esc(l.id)}" ${kitOf(s).relay ? '' : 'disabled title="You have no relay yet."'}>Install relay${kitOf(s).relay ? ` (${kitOf(s).relay})` : ''}</button>` : ''}${!l.takenOver && !l.member && !l.passwordKnown && kitOf(s).cracker ? `<button type="button" class="btn" data-command="use cracker ${esc(l.id)}">Key cracker (${kitOf(s).cracker})</button>` : ''}${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn ${st !== 'done' ? 'primary' : ''}" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relockLeft(l) ? 'disabled title="Still tracing your last connection"' : ''}>${relockLeft(l) ? `Connect · ${relockLeft(l)}s` : 'Connect'}</button>`}${!l.member && !l.trunk && s.locations.includes(l) && MEMORY.on && !freeOfMemory(l) ? `<button type="button" class="btn small mem-x" data-command="detach ${esc(l.id)}" data-confirm="Click again to detach" ${busy ? 'disabled' : ''} title="Free a memory slot. Frozen until you attach it again.">${glyph('memory')}Detach · ${memoryCost(l)}</button>` : ''}</div></section>`;
}

// The swarm: what's coming, where, when, and the button to meet it.
function fleetCard(s) {
  const f = s.fleet;
  if (!f) return '';
  const t = s.locations.find((l) => l.id === f.target), busy = active(s) || s.run;
  const fam = FAMILIES[f.family], m = MUTATIONS[f.mutation];
  return `<section class="card alert"><h2>Swarm${f.faction ? ` from ${esc(FX[f.faction].short)}` : ''} · ${f.state === 'travel' ? 'on its way' : 'at the outpost'}</h2><h1>${f.ships} of ${f.total} ${esc(fam.name)}</h1>
    <p>${levelTag(s, f.level)} ${esc(fam.name)}${m ? ` <span class="tag tag-mut" title="${esc(m.rule)}">${esc(m.name)}</span>` : ''}</p>
    <div class="stats">${stat('Target', esc(t?.name || '?'))}${stat(f.state === 'travel' ? 'Arrives in' : 'Falls in', fmtLeft(fleetLeft(s)))}</div>
    <p class="svc-line">from ${esc(f.fromName)}</p>
    <div class="row"><button type="button" class="btn primary" data-command="swarm engage" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>${f.state === 'travel' ? 'Intercept' : 'Defend'}</button></div></section>`;
}

// Outpost modules: the server's ports on this outpost, and what fits them.
// Buildings (outpost.mjs) on a held server: slots and bandwidth up top, what's built (× takes it
// down), the build running now, what's stored, threats, and a Build list where every building
// says what it costs or why you can't build it yet.
const BICON = { siphon: 'siphon', skimmer: 'credits', mill: 'salvage', node: 'node', storage: 'storage', pipeline: 'pipeline', ids: 'ids', lure: 'lure', miner: 'scraper', sentry: 'kill', refinery: 'pipeline', citadel: 'firewall' };
const STORE_NAME = (k, l) => (k === 'code' ? MATERIALS[codeOf(l.family)].name : k === 'rolls' ? 'loot rolls' : k);
function outpostCard(s, l) {
  if (!l.takenOver) return '';
  const o = l.outpost || {}, busy = active(s) || s.run, now = Date.now();
  const why = busy ? 'disabled title="Finish what you are doing first"' : '';
  const mine = buildingsOf(l), slots = slotsOf(l), size = serverSize(l);
  const head = `<div class="op-head"><span class="tag ${mine.length ? 'you' : 'dim'}" title="${mine.length ? 'It has buildings: its natives can notice it.' : 'Nothing built yet.'}">${mine.length ? 'Outpost' : 'Held'}</span>${slotPips('module', mine.length + (l.build ? 1 : 0), slots, `Building slots (a ${size.id} server)`)}<span class="tag dim" title="Bandwidth used across your network: what your buildings take">${glyph('router')}${bandwidthUsed(s)}/${bandwidth(s)}</span></div>`;
  const tiles = mine.length ? `<div class="mods">${mine.map((id) => `<span class="mod on" title="${esc(BUILDINGS[id].rule)}">${glyph(BICON[id] || 'module')}${esc(BUILDINGS[id].name)}<button type="button" class="mod-x" data-command="outpost demolish ${esc(l.id)} ${id}" data-confirm="Take it down? Half its credits back" ${busy ? 'disabled' : ''} aria-label="Take down ${esc(BUILDINGS[id].name)}">×</button></span>`).join('')}</div>` : '';
  const b = l.build;
  const prog = b ? `<div class="install op-build"><div class="install-top"><b>${glyph(BICON[b.id] || 'module')}${esc(BUILDINGS[b.id].name)}</b><span>${fmtTime(b.doneAt - now)} left</span></div><div class="install-bar"><span style="width:${Math.min(100, Math.max(0, ((now - b.startedAt) / (b.doneAt - b.startedAt)) * 100))}%"></span></div><div class="row">${buyoutBtn(s, `outpost buyout ${l.id}`, outpostBuyout(l, now)?.price)}</div></div>` : '';
  const per = makes(s, l), cap = capOf(s, l), st = o.stock || {};
  const store = Object.keys(per).length ? `<div class="op-store">${Object.entries(per).map(([k, v]) => `<span class="tag dim" title="${esc(STORE_NAME(k, l))}: ${Math.round(v * 10) / 10} an hour">${glyph(k === 'code' ? codeOf(l.family) : k === 'rolls' ? 'scraper' : k)}${Math.floor(st[k] || 0)}/${cap[k]}</span>`).join('')}<small>Connect to collect.</small></div>` : '';
  const opBox = (kind, title, info, btnHtml) => `<div class="op-box ${kind}"><div class="op-top"><span class="tag hot">${title}</span><small>${info}</small></div><div class="row">${btnHtml}</div></div>`;
  const lock = o.lockdown ? opBox('lost', 'Lockdown', `${fmtTime(o.lockdown.left)} left. It makes nothing until then; what's stored is kept.`, `<button type="button" class="btn primary" data-command="outpost retake ${esc(l.id)}" ${why}>Retake</button>${buyoutBtn(s, `outpost buyout ${l.id}`, outpostBuyout(l, now)?.price)}`) : '';
  const fl = s.fleet && s.fleet.target === l.id ? opBox('swarm', s.fleet.faction ? `Swarm from ${esc(FX[s.fleet.faction].short)}` : s.fleet.natives ? 'Natives' : 'Swarm', `${s.fleet.ships} ${esc(FAMILIES[s.fleet.family].name.toLowerCase())} · ${s.fleet.state === 'travel' ? `arrives in ${fmtLeft(fleetLeft(s))}` : `falls in ${fmtLeft(s.fleet.siegeLeft)}`}`, `<button type="button" class="btn primary" data-command="swarm engage" ${why}>${s.fleet.state === 'travel' ? 'Intercept' : 'Defend'}</button>`) : '';
  // The Build list: buildings you could put here, cheapest first; the rest say what they need.
  const rows = Object.keys(BUILDINGS).filter((id) => !mine.includes(id) && b?.id !== id).map((id) => {
    const B = BUILDINGS[id], block = buildBlock(s, l, id, now), c = buildCost(s, id, l);
    return `<li class="${block ? 'locked' : ''}"><div class="bl-main"><b>${glyph(BICON[id] || 'module')}${esc(B.name)}</b><small>${esc(B.rule)}</small><small class="bl-cost">${esc(costLine(c))} · ${B.mins >= 60 ? `${B.mins / 60} h` : `${B.mins} min`} · ${B.bw} bandwidth</small>${block ? `<small class="bl-why">${esc(block)}</small>` : ''}</div><button type="button" class="btn small ${block ? '' : 'primary'}" data-command="outpost build ${esc(l.id)} ${id}" data-pay="building:${c.salvage.any}" data-pay-title="${esc(B.name)}" ${block || busy ? 'disabled' : ''}>Build</button></li>`;
  }).join('');
  const list = `<details class="op-buildlist"${mine.length ? '' : ' open'}><summary>Build</summary><ul class="bl">${rows}</ul></details>`;
  const hint = !mine.length && !b ? '<p class="op-hint">This server is yours. Build on it to make it produce or defend itself. Buildings take its slots and your bandwidth.</p>' : '';
  return `<div class="outpost${fl ? ' besieged' : ''}${o.lockdown ? ' lost' : ''}">${head}${hint}${tiles}${prog}${store}${mine.length ? fwRow(s, l, l.id, (l.level || 1) + 2) : ''}${lock}${fl}${list}</div>`;
}

const layoutName = (l) => ({ relay: 'Relay node', mailhub: 'Mail hub', mirror: 'Public mirror', archive: 'Backup archive', lab: 'Research lab' })[l.template] || 'Node';

// Free memory: the pips you have, and the one(s) a server would take (blinking): "4 → 3/4 free".
function memPips(j) {
  const free = Math.max(0, j.cap - j.used), left = j.cap - j.used - j.add;
  return `<span class="slots mem-join${j.fits ? '' : ' over'}" title="Free memory: ${free}/${j.cap} → ${Math.max(0, left)}/${j.cap}">${glyph('memory')}${Array.from({ length: j.cap }, (_, i) => `<i class="${i < Math.max(0, left) ? 'on' : i < free ? 'take' : ''}"></i>`).join('')}<small>${free}<span class="mj-to">→</span><b>${left}</b>/${j.cap} free</small></span>`;
}
// Volume sliders: music, ambience (radio, rain, the street, the room tone), effects.
export const volumesOf = (s) => ({ music: 0.8, ambience: 0.8, sfx: 0.8, ...(s.settings?.volume || {}) });
function volumeCard(s) {
  const v = volumesOf(s);
  const row = (id, label, title) => `<label class="vol-row" title="${esc(title)}"><span class="vol-name">${label}</span><input type="range" min="0" max="100" step="1" value="${Math.round(v[id] * 100)}" data-volume="${id}" aria-label="${label} volume"><b class="vol-val" data-volume-val="${id}">${Math.round(v[id] * 100)}</b></label>`;
  return `<section class="card vol-card"><h2>Sound</h2>${s.settings.sound ? '' : '<p class="svc-line">Sound is off.</p>'}
    ${row('music', 'Music', 'The soundtrack')}${row('ambience', 'Ambience', 'Radio chatter, rain, thunder, the street and the room tone')}${row('sfx', 'Effects', 'Hits, keys, alerts and everything else the game plays')}</section>`;
}

function paceCard(s) {
  const p = paceOf(s);
  const line = p.perHour == null ? `Not enough play yet: ${p.kills} ${p.kills === 1 ? 'kill' : 'kills'} in ${Math.round(p.minutes)} min.` : `<b>${p.perHour}</b> kills an hour (${p.kills} in ${p.minutes >= 90 ? (p.minutes / 60).toFixed(1) + ' h' : Math.round(p.minutes) + ' min'} of play).`;
  return `<section class="card"><h2>Pace</h2><p class="svc-line" title="Counts time while the game is open and you've used it in the last 2 minutes. Drop odds assume ${LOOT.killsPerHour} kills an hour.">${line}</p></section>`;
}

export function systemMarkup(s) {
  return `<div class="page-grid"><div style="display:grid;gap:12px">${volumeCard(s)}${paceCard(s)}
    <section class="card"><h2>Settings</h2><div class="row">
      <button type="button" class="btn" data-toggle="speed">Speed: ${esc(s.settings.speed || 'normal')} (${cycleLength(s) / 1000}s per cycle)</button>
      <button type="button" class="btn" data-toggle="sound" aria-pressed="${!!s.settings.sound}">Sound ${s.settings.sound ? 'on' : 'off'}</button>
      <button type="button" class="btn" data-toggle="motion" aria-pressed="${!!s.settings.motion}">Motion ${s.settings.motion ? 'on' : 'off'}</button>
      <button type="button" class="btn" data-run="effects next" title="How much moves in a fight. Calm: the number, the bar and who did it. Full: impact bursts, sparks and flashes too. Minimal: numbers and bars only.">Effects: ${esc(['full', 'minimal'].includes(s.settings.effects) ? s.settings.effects : 'calm')}</button>
      <button type="button" class="btn" data-run="music ${s.settings.music === false ? 'on' : 'off'}" aria-pressed="${s.settings.music !== false}" ${s.settings.sound ? '' : 'disabled'} title="Music from the music folder, one track for home, runs and fights">Music ${s.settings.music === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="radio ${s.settings.radio === false ? 'on' : 'off'}" aria-pressed="${s.settings.radio !== false}" ${s.settings.sound ? '' : 'disabled'} title="Stray transmissions in the static">Radio ${s.settings.radio === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="radio test" ${s.settings.sound ? '' : 'disabled'}>Test radio</button>
      <button type="button" class="btn" data-toggle="haptics" aria-pressed="${!!s.settings.haptics}" title="Vibration works on Android phones">Vibrate ${s.settings.haptics ? 'on' : 'off'}</button>
      <button type="button" class="btn" data-run="shell toggle" aria-pressed="${s.settings.shell !== 'plain'}" title="CRT screen, boot sequence, status line, glitches when you're hit">Shell: ${s.settings.shell === 'plain' ? 'plain' : 'immersive'}</button>
      <button type="button" class="btn" data-run="shell boot" ${s.settings.shell === 'plain' ? 'disabled' : ''}>Reboot screen</button>
      <button type="button" class="btn" data-run="casing ${s.settings.casing === false ? 'on' : 'off'}" aria-pressed="${s.settings.casing !== false}" ${s.settings.shell === 'plain' ? 'disabled' : ''} title="The monitor around the screen, on wide screens">Casing ${s.settings.casing === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="window ${s.settings.window === false ? 'on' : 'off'}" aria-pressed="${s.settings.window !== false}" ${s.settings.shell === 'plain' || s.settings.casing === false ? 'disabled' : ''} title="The city outside, beside the monitor">Window ${s.settings.window === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="tips ${s.settings.tips === false ? 'on' : 'off'}" aria-pressed="${s.settings.tips !== false}">Tips ${s.settings.tips === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="tips replay">Replay tips</button>
    </div>
    <div class="row sound-test"><span class="next-label">Sound test</span>${[['hit', 'Hit'], ['break', 'Break'], ['hurt', 'Hurt'], ['unlock', 'Unlock'], ['pickup', 'Pickup'], ['good', 'Good news'], ['win', 'Win / level'], ['chit', 'Armor ◆'], ['patch', 'Patch'], ['interrupt', 'Interrupt'], ['nope', 'Refused'], ['prewarn', 'Warning'], ['daemon', 'Daemon'], ['channel', 'Channel change'], ['jackin', 'Connect'], ['hangup', 'Hang up'], ['lose', 'Crash'], ['mark', 'Mark'], ['burn', 'Burn'], ['helper', 'Helper'], ['shield', 'Shield'], ['buff', 'Buff']].map(([id, name]) => `<button type="button" class="btn" data-sound="${id}">${name}</button>`).join('')}</div></section>
    ${collectionMarkup(s)}
    ${codexMarkup(s)}
    <section class="card"><h2>New game</h2><div class="row"><button type="button" class="btn" data-run="reset game">Reset game</button></div></section>
    <section class="card"><h2>Wire</h2><div class="ticker"><span>${(TICKER.map(esc).join('  //  ') + '  //  ').repeat(2)}</span></div></section>
    <section class="card"><h2>Fight reports</h2>${s.reports.length ? `<details><summary>${s.reports.length} report(s)</summary><pre>${esc(JSON.stringify(s.reports.slice(-5), null, 1))}</pre></details>` : '<p>None yet.</p>'}</section></div>
    <section class="card"><h2>Log</h2><ol class="fulllog">${s.logs.slice(-300).map((e) => `<li>c${e.cycle} · ${esc(e.message)}</li>`).join('')}</ol></section></div>`;
}

// What a won fight gave you, as rows for the card over the virus picture.
// events: everything from the fight (loot from breaks) through the victory batch.
// Each row: { text (one line, for tests and screen readers), label, qty, kind, pack, rarity, sub }.
export function spoilsOf(events) {
  const out = [];
  const add = (label, qty, kind, extra = {}) => out.push({ label, qty, kind, pack: false, ...extra, text: extra.text || (qty ? `${qty} ${label}` : label) });
  const loot = events.filter((e) => e.type === 'loot');
  if (loot.length) add('Salvage', String(loot.length), 'loot', { text: `${loot.length} salvage`, sub: [...new Set(loot.map((e) => String(e.message || '').replace(/ recovered\.$/, '')))].filter(Boolean).join(', ') });
  const xp = events.filter((e) => e.type === 'xp').reduce((n, e) => n + e.amount, 0);
  if (xp) add('XP', `+${xp}`, 'xp', { text: `+${xp} XP` });
  for (const e of events) {
    if (e.type === 'fast-kill') add('Fast kill', `+${e.amount} XP`, 'fast', { text: `Fast kill +${e.amount} XP`, sub: `${e.cycles} cycles` });
    else if (e.type === 'hot-kill') add('Hot strain', `+${e.amount} XP`, 'fast', { text: `Hot strain +${e.amount} XP` });
    else if (e.type === 'xp' && / decoded$/.test(e.message?.split(' · ')[1]?.replace(/\.$/, '') || '')) add(`Decoded: ${e.message.split(' · ')[1].replace(/ decoded\.?$/, '')}`, `+${e.amount} XP`, 'fast', { text: `${e.message.split(' · ')[1]} +${e.amount} XP` });
    else if (e.type === 'rested') add('Rested', `+${e.amount} XP`, 'fast', { text: `Rested +${e.amount} XP` });
    else if (e.type === 'fresh') add(`Fresh: ${XP_KINDS[e.kind] || ''}`, `+${e.amount} XP`, 'fast', { text: `Fresh ${XP_KINDS[e.kind] || ''} +${e.amount} XP` });
    else if (e.type === 'level-up') add(`Level ${e.level}`, '', 'level', { sub: e.unlocked?.length ? 'New skill unlocked' : 'Power +4%' });
    else if (e.type === 'server-level') add(`Server level ${e.level}`, '', 'level');
    else if (e.type === 'code' && e.gains) for (const [m, n] of Object.entries(e.gains)) add(MATERIALS[m]?.name || m, `+${n}`, m === 'exploit' ? 'exploit' : 'code', { pack: !!e.pack, text: `+${n} ${MATERIALS[m]?.name || m}` });
    else if (e.type === 'drop') {
      const what = e.item ? itemLabel(e.item) : e.daemon || /daemon/i.test(e.message || '') ? 'Daemon' : e.recipe || /blueprint/i.test(e.message || '') ? 'Blueprint' : 'Drop';
      const kind = e.item ? 'item' : what === 'Daemon' ? 'daemon' : what === 'Blueprint' ? 'blueprint' : 'item';
      add(what, '', kind, { pack: !!e.pack, rarity: e.item?.rarity, sub: e.item ? statLine(e.item.stats) : '' });
    } else if (e.type === 'lead') {
      // Say where the trace leads: the server that sent this family, an unknown server, or a hub.
      const m = e.message.match(/(\w+) lead \+(\d+)% \((\d+)%\)/), h = e.message.match(/Unknown (\w+) server past ([^:]+): (\d+)%/), f = e.message.match(/(\S+(?: \S+)?) hub trace (\d+)%/);
      if (m) add(`Trace to a ${m[1].toLowerCase()} server`, `+${m[2]}%`, 'lead', { text: `Trace to a ${m[1].toLowerCase()} server +${m[2]}%`, sub: 'At 100% you find the server that sent them', pct: Math.min(100, +m[3]), from: Math.max(0, +m[3] - +m[2]) });
      else if (h) add(`Trace to the unknown ${h[1]} server past ${h[2]}`, `${h[3]}%`, 'lead', { text: `Trace to the unknown ${h[1]} server past ${h[2]}: ${h[3]}%`, pct: Math.min(100, +h[3]) });
      else if (f) add(`Trace to the ${f[1]} hub`, `${f[2]}%`, 'lead', { text: `Trace to the ${f[1]} hub: ${f[2]}%`, pct: Math.min(100, +f[2]) });
    }
    else if (e.type === 'collected') add('New in collection', '', 'found', { text: `New in collection: ${e.message.replace(/^Collection: /, '')}` });
    else if (e.type === 'located') add(e.message.replace(/^[^:]*: /, 'Found ').replace(/\.$/, ''), '', 'found');
    else if (e.type === 'contract-ready') { if (/is down\. Contract ready/.test(e.message || '')) add('Bounty target down', '', 'bounty', { sub: 'Deliver it from Mail' }); else add('Contract ready', '', 'found'); }
    else if (e.type === 'outpost-held') {
      // A consortium bounty: its own row, with the flair it deserves.
      const b = String(e.message || '').match(/Bounty: \+(\d+) credits(?:, \+(\d+) ([^.]+))?/);
      if (b) add('Bounty', `+${b[1]}c`, 'bounty', { text: `Bounty +${b[1]} credits`, sub: b[2] ? `+${b[2]} ${b[3]}` : '' });
      else add('Outpost secured', '', 'found');
    }
  }
  return out;
}

const SPOIL_ICON = {
  xp: '<path d="M3 11l5-5 5 5M3 7l5-5 5 5"/>',
  code: '<path d="M6 3L2 8l4 5M10 3l4 5-4 5"/>',
  exploit: '<path d="M8 2l2 4 4 .5-3 3 .8 4.5L8 12l-3.8 2 .8-4.5-3-3L6 6z"/>',
  loot: '<path d="M3 5l5-3 5 3v6l-5 3-5-3zM3 5l5 3 5-3M8 8v6"/>',
  item: '<rect x="4" y="4" width="8" height="8" rx="1"/><path d="M6 2v2M10 2v2M6 12v2M10 12v2M2 6h2M2 10h2M12 6h2M12 10h2"/>',
  blueprint: '<rect x="2.5" y="2.5" width="11" height="11"/><path d="M2.5 6.5h11M6.5 2.5v11"/>',
  daemon: '<circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="1.5"/>',
  lead: '<circle cx="8" cy="8" r="5"/><path d="M8 1v4M8 11v4M1 8h4M11 8h4"/>',
  found: '<path d="M3 8.5l3 3 7-7"/>',
  lost: '<path d="M4 4l8 8M12 4l-8 8"/>',
  time: '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>',
  bounty: '<path d="M8 1.5l2 4.2 4.5.6-3.3 3.1.8 4.5L8 11.7l-4 2.2.8-4.5L1.5 6.3 6 5.7z"/><circle cx="8" cy="8" r="1.6"/>',
  level: '<path d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.4L8 11.2 4.1 13.4l.9-4.4-3.3-3 4.4-.5z"/>',
  credits: '<ellipse cx="8" cy="5" rx="5" ry="2"/><path d="M3 5v6c0 1.1 2.2 2 5 2s5-.9 5-2V5M3 8c0 1.1 2.2 2 5 2s5-.9 5-2"/>',
  fast: '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z"/>',
};
const spIcon = (k) => `<svg class="sp-ico" viewBox="0 0 16 16" aria-hidden="true">${SPOIL_ICON[k] || SPOIL_ICON.item}</svg>`;
const spRow = (r, i) => `<li class="sp-row k-${r.kind}${r.rarity ? ' r-' + r.rarity : ''}" style="--i:${i}">${spIcon(r.kind)}<span class="sp-lbl"><span class="sp-t" data-decode="${esc(r.label)}">${esc(r.label)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}${r.pct != null ? `<span class="sp-bar lead"><span class="sp-was" style="width:${r.from}%"></span><span class="sp-now" style="--from:${r.from}%;--to:${r.pct}%"></span></span>` : ''}</span>${r.pack ? '<span class="sp-pack">pack</span>' : ''}<b class="sp-qty">${esc(r.qty)}</b></li>`;

// The card itself. head: { name, level, family, cycles, damage, clean }. xp: { level, from, to } (0–1) or null.
export function spoilsMarkup(head, rows, xp, goLabel = 'Continue') {
  const icon = spIcon;
  const bar = (from, to, cls = '') => `<span class="sp-bar ${cls}"><span class="sp-was" style="width:${from * 100}%"></span><span class="sp-now" style="--from:${from * 100}%;--to:${to * 100}%"></span></span>`;
  const main = rows.filter((r) => r.kind !== 'xp' && r.kind !== 'level');
  const xpRow = rows.find((r) => r.kind === 'xp');
  const levels = rows.filter((r) => r.kind === 'level');
  return `<div class="sp-card" role="status" aria-label="${esc(rows.map((r) => r.text).join(', '))}">
    <i class="sp-corner tl"></i><i class="sp-corner tr"></i><i class="sp-corner bl"></i><i class="sp-corner br"></i>
    <header class="sp-head"><span class="sp-kicker">Neutralized</span><strong class="sp-name" data-decode="${esc(head.name)}">${esc(head.name)}</strong>
      <span class="sp-meta">Lv ${head.level} ${esc(head.family)} · ${head.cycles} cycles · ${head.clean ? '<em class="sp-clean">clean</em>' : `−${head.damage}`}</span></header>
    ${xpRow || levels.length ? `<div class="sp-xp" style="--i:0">${icon('xp')}<span class="sp-lbl">Lv ${xp?.level ?? ''}</span>${xp ? bar(xp.from, xp.to, levels.length ? 'up' : '') : ''}<b class="sp-qty">${xpRow ? esc(xpRow.qty) : ''} XP</b></div>` : ''}
    ${levels.map((r, i) => `<div class="sp-level" style="--i:${i + 1}">${icon('level')}<span>${esc(r.label)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>`).join('')}
    <ul class="sp-rows">${main.map((r, i) => spRow(r, i + 1 + levels.length)).join('')}</ul>
    <button type="button" class="sp-go" data-spoils-go style="--i:${main.length + levels.length + 1}">${esc(goLabel)} <kbd>Enter</kbd></button></div>`;
}

// What a pull or a jack-out gave you, in the same card. kicker: 'Pulled' | 'Banked'.
// A pull is one row and goes away on its own; Banked waits for Enter.
export function gainMarkup(kicker, name, rows, go = true) {
  return `<div class="sp-card gain-card" role="status" aria-label="${esc(kicker)}: ${esc(rows.map((r) => r.text).join(', ') || 'nothing')}">
    <i class="sp-corner tl"></i><i class="sp-corner tr"></i><i class="sp-corner bl"></i><i class="sp-corner br"></i>
    <header class="sp-head"><span class="sp-kicker">${esc(kicker)}</span>${name ? `<strong class="sp-name">${esc(name)}</strong>` : ''}</header>
    <ul class="sp-rows">${rows.length ? rows.map((r, i) => spRow(r, i)).join('') : '<li class="sp-row k-none" style="--i:0"><span class="sp-lbl">—</span></li>'}</ul>
    ${go ? `<button type="button" class="sp-go" data-gain-go style="--i:${rows.length + 1}">Continue <kbd>Enter</kbd></button>` : ''}</div>`;
}

// Salvage as stacks: components (what specific recipes ask for) marked.
export function salvageStacksMarkup(s) {
  const st = salvageStacks(s);
  if (!st.length) return '';
  return `<h3 class="sv-head">${glyph('salvage')}Salvage</h3><ul class="sv-rows">${st.map((x) => `<li class="${x.component ? 'comp' : ''}" title="${esc(x.component ? `${x.name}: counts as any salvage, and some recipes ask for it by name.` : `${x.name}: counts as any salvage.`)}"><span class="sv-name">${esc(x.name)}</span>${x.component ? '<span class="tag sv-tag">component</span>' : '<span></span>'}<b>${x.n}</b></li>`).join('')}</ul>`;
}

// The payment picker: which salvage pays for this. key: a SALVAGE_COSTS key with an optional
// ':n' (the generic amount). pay: { name: n } chosen so far.
export function payMarkup(s, key, pay, title) {
  const [id, n] = key.split(':');
  const cost = SALVAGE_COSTS[id](Number(n) || 0);
  const st = salvageStacks(s);
  const used = Object.values(pay).reduce((a, b) => a + b, 0), need = salvageTotal(cost);
  const problem = payProblem(s, cost, pay);
  const reqs = cost.need.map((x) => { const got = x.names.reduce((a, nm) => a + (pay[nm] || 0), 0); return `<span class="pay-req ${got >= x.n ? 'ok' : ''}">${esc(x.label)} <b>${Math.min(got, x.n)}/${x.n}</b></span>`; });
  const wanted = new Set(cost.need.flatMap((x) => x.names));
  return `<div class="pay-card" role="dialog" aria-label="Pay salvage for ${esc(title)}">
    <header><span class="sp-kicker">Pay salvage</span><strong>${esc(title)}</strong><small>${esc(salvageLabel(cost))}</small></header>
    <div class="pay-reqs">${reqs.join('')}<span class="pay-req ${used === need ? 'ok' : ''}">Total <b>${used}/${need}</b></span></div>
    <ul class="pay-stacks">${st.map((x) => { const k = pay[x.name] || 0; return `<li class="${wanted.has(x.name) ? 'wanted' : x.component ? 'comp' : ''}${k ? ' on' : ''}"><span class="pay-name">${esc(x.name)}${wanted.has(x.name) ? ' <em>needed</em>' : ''}</span><span class="pay-step"><button type="button" data-pay-step="${esc(x.name)}" data-d="-1" ${k ? '' : 'disabled'} aria-label="One less ${esc(x.name)}">−</button><b>${k}</b><button type="button" data-pay-step="${esc(x.name)}" data-d="1" ${k < x.n && used < need ? '' : 'disabled'} aria-label="One more ${esc(x.name)}">+</button></span><small>of ${x.n}</small></li>`; }).join('')}</ul>
    <footer><span class="pay-why ${problem ? '' : 'ok'}">${esc(problem || 'Ready.')}</span><button type="button" class="btn" data-pay-cancel>Cancel</button><button type="button" class="btn primary" data-pay-go ${problem ? 'disabled' : ''}>Build</button></footer></div>`;
}
export const paySlugs = (pay) => Object.entries(pay).filter(([, n]) => n).map(([k, n]) => `${slug(k)}:${n}`).join(',');

// "New" counts on the Loadout, Craft and Daemons tabs: what arrived since you last opened each.
// s.seen keeps what you've seen; a save from before badges starts with everything seen.
const NEW_TABS = {
  loadout: (s) => (s.stash || []).map((it) => it.id),
  craft: (s) => [...(s.recipes || [])],
  daemons: (s) => Object.entries(s.daemonsOwned || {}).map(([id, v]) => `${id}:${v}`),
  skills: (s) => knownSkills(s, classOf(s)).map((id) => `${classOf(s)}:${id}`), // a level that unlocked a skill: shown on Loadout
};
export function newOn(s, tab) {
  if (!NEW_TABS[tab]) return 0;
  if (!s.seen) { s.seen = {}; for (const t of Object.keys(NEW_TABS)) s.seen[t] = NEW_TABS[t](s); }
  for (const t of Object.keys(NEW_TABS)) s.seen[t] ||= NEW_TABS[t](s); // a tab added later starts seen
  const seen = new Set(s.seen[tab] || []);
  return NEW_TABS[tab](s).filter((x) => !seen.has(x)).length;
}
export function sawTab(s, tab) {
  if (!NEW_TABS[tab]) return;
  newOn(s, tab);
  s.seen[tab] = NEW_TABS[tab](s);
}


// ---------- the sidebar: on every page, fights included ----------
// You (your health), your crew (live bars in a fight), then what this page is about: the map's
// selection, the virus you're fighting, or what needs you. Narrow screens and `sidebar off` hide it.
// On a run (out of a fight): where a crewmate is, whether they're linked to you, and what you can do.
function runMate(s, name) {
  const c = s.run?.crew?.[name];
  if (!c) return '';
  const linkedYou = c.link === 'you', youFollow = s.run.linkedTo === name, here = c.cwd === s.run.cwd;
  const state = linkedYou ? '<span class="tag good pm-st" title="Linked: they move with you">with you</span>' : youFollow ? '<span class="tag you pm-st" title="You follow them">leading</span>' : '<span class="tag dim pm-st" title="On their own">solo</span>';
  const acts = [
    linkedYou ? `<button type="button" class="act" data-run="split ${esc(name)}" title="Let ${esc(name)} go their own way">Unlink</button>` : '',
    !linkedYou && !here ? `<button type="button" class="act" data-run="goto ${esc(name)}">Go to</button>` : '',
    !linkedYou && !youFollow ? `<button type="button" class="act" data-run="link ${esc(name)}">Link</button>` : '',
    youFollow ? `<button type="button" class="act" data-run="unlink" title="Stop following ${esc(name)}">Unlink</button>` : '',
  ].join('');
  return `<div class="pm-run"><span class="pm-where">${state}<code title="Where ${esc(name)} is">${esc(c.cwd)}</code></span><span class="pm-acts">${acts}</span></div><button type="button" class="pm-kick" data-run="crew kick ${esc(name)}" title="Take ${esc(name)} out of your crew" aria-label="Remove ${esc(name)}">×</button>`;
}
const CREW_PARTY = (s, mates, inFight, fc, actedWho) => `<div class="party">${mates.map((m) => {
        const live = inFight && m.encounter, up = !live || mateUp(m), sig = live ? m.run.integrity : mateSignal(s, m), pct = (sig / m.run.max) * 100, q = live ? m.encounter.queue : null;
        // What they mean to do this cycle: the skill (its verb's colour and icon) and the part.
        const a = q && ABILITIES[q.ability], tgt = q?.target && part(s, q.target);
        const intent = !live ? '' : !up ? '<div class="pm-intent dim">down</div>' : a ? `<div class="pm-intent verb-${a.verb}" title="${esc(a.help || a.short || '')}">${glyph(a.verb)}<b>${esc(a.name)}</b>${tgt ? `<span class="pm-at">→ ${esc(tgt.name)}</span>` : ''}${q.last ? '<small>last</small>' : ''}</div>` : '<div class="pm-intent dim">holding</div>';
        return `<div class="pmate${up ? '' : ' down'}${m.who === actedWho ? ' acting' : ''}" data-mate="${esc(m.who)}"><b>${esc(m.who)}</b><small class="pm-cls">${esc(ARCHETYPES[m.loadout.archetype].name)} <span class="pm-lv">Lv ${hackerLevel(m)}</span></small>${live && up && drawingFire(m) ? '<span class="tag hot pm-tag">drawing fire</span>' : ''}<span class="pbar"><span style="width:${pct}%"></span>${fc ? lossMark(m.run.integrity, m.run.max, fc.mates[m.who] || 0) : ''}</span><small>${up ? `${sig}/${m.run.max}` : 'down'}</small>${intent}${!inFight ? runMate(s, m.who) : ''}</div>`;
      }).join('')}</div>`;
// The crew window (app.js floats it, draggable): the crew as they'll join you, live in a run fight
// (bars, who's down, what each means to do this cycle). Only there when you have a crew.
export function crewWindowMarkup(s, { preview = null, collapsed = false } = {}) {
  const mates = matesOf(s);
  if (!mates.length) return '';
  const inFight = active(s) && s.encounter.mode === 'run';
  const apart = s.run && Object.values(s.run.crew || {}).some((c) => c.link !== 'you');
  const foot = s.run && !inFight && Object.keys(s.run.crew || {}).length ? `<div class="cw-foot">${apart ? '<button type="button" class="act" data-run="regroup">Regroup</button>' : '<button type="button" class="act dim" data-run="split all">Split all</button>'}</div>` : '';
  return `<header class="cw-head"><b>${inFight ? 'Party' : 'Crew'}</b><small>${mates.length}/3</small><button type="button" class="cw-btn" data-cw-toggle title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button></header>${collapsed ? '' : `<div class="cw-body sb-crew">${crewParty(s, preview)}${foot}</div>`}`;
}
function crewParty(s, preview) {
  const fighting = active(s), e = s.encounter;
  const mates = matesOf(s), inFight = fighting && e.mode === 'run';
  const fc = inFight ? forecast(s, preview) : null;
  const actedWho = inFight ? e.steps?.order?.[e.steps.next - 1] : null;
  return CREW_PARTY(s, mates, inFight, fc, actedWho);
}
export function sidebarMarkup(s, { module = 'map', mapSel = 'server', mapView = 'mine', preview = null } = {}) {
  const fighting = active(s), e = s.encounter;
  // The crew: live in a run fight, else as they'll join you.
  const mates = matesOf(s), inFight = fighting && e.mode === 'run';
  const fc = inFight ? forecast(s, preview) : null;
  const actedWho = inFight ? e.steps?.order?.[e.steps.next - 1] : null; // whose turn just played
  const crew = mates.length
    ? `<section class="sb-block sb-crew"><div class="sb-head"><b>${inFight ? 'Party' : 'Crew'}</b><small>${mates.length}/3</small></div>${CREW_PARTY(s, mates, inFight, fc, actedWho)}</section>`
    : `<section class="sb-block sb-crew solo"><div class="sb-head"><b>Crew</b><small>solo</small></div><button type="button" class="act dim" data-people-open title="Friends, consortium members and who's online">${glyph('run')}Find a crew</button></section>`;
  // What this page is about.
  let ctx = '';
  if (fighting && module === 'combat') {
    ctx = ''; // the HUD has the virus and your status
  } else if (module === 'map') {
    ctx = `<div class="sb-select">${mapSelection(s, mapSel, mapView)}</div>`;
  } else {
    const al = commsOf(s).filter((c) => !c.done && c.go).slice(0, 4);
    ctx = al.length ? `<section class="sb-block sb-alerts"><div class="sb-head"><b>Needs you</b><small>${al.length}</small></div><ul>${al.map((c) => `<li><button type="button" class="act" data-go="${esc(c.go)}" data-cid="${c.id}" title="${esc(c.text)}"><span class="k ${c.kind}">${esc(c.label)}</span>${esc(c.text.length > 60 ? c.text.slice(0, 58) + '…' : c.text)}</button></li>`).join('')}</ul></section>` : '';
  }
  // No health block: Integrity and Signal live on the top bar (and the HUD in a fight).
  return fighting && module === 'combat' ? crew : `${crew}${ctx}`;
}


// ---------- factions (factions.mjs) ----------
const fIcon = (f, cls = '') => `<span class="fmark-i ${cls}" style="--fc:${FX[f].color}" title="${esc(FX[f].name)}">${glyph('f-' + f)}</span>`;
// Rep as a bar of the faction's five tiers, filled to where you stand.
export function repBar(s, f) {
  const r = rep(s, f), t = repTier(s, f);
  const segs = REP_TIERS.map((min, i) => { const max = REP_TIERS[i + 1] ?? 101, fill = Math.max(0, Math.min(1, (r - min) / (max - min))); return `<span class="rb-seg${i === t.i ? ' on' : ''}" title="${esc(FX[f].tiers[i])} (${min}+)"><i style="width:${fill * 100}%"></i></span>`; }).join('');
  const neg = f === 'halcyon' ? '' : `<span class="rb-seg rb-neg${r < 0 ? ' on' : ''}" title="How deep: ${r < 0 ? r : 0} of −100"><i style="width:${Math.min(100, Math.max(0, -r))}%"></i></span>`;
  return `<div class="repbar" style="--fc:${FX[f].color}" title="${esc(FX[f].short)}: ${r} · ${esc(t.name)}${t.next != null ? ` · next at ${t.next}` : ''}">${neg}${segs}<b>${esc(t.name)}${r < 0 ? ` ${r}` : ''}</b></div>`;
}
const relations = (f) => `<div class="frel">${FX[f].allies.length ? `<span class="frel-k">allies</span>${FX[f].allies.map((x) => fIcon(x)).join('')}` : ''}${FX[f].rivals.length ? `<span class="frel-k">rivals</span>${FX[f].rivals.map((x) => fIcon(x)).join('')}` : ''}</div>`;
function hubCard(s, f) {
  const F = FX[f], h = hubOf(s, f);
  return `<section class="card fcard" style="--fc:${F.color}"><h2>${F.kind === 'corp' ? 'Company' : 'Hacker crew'} · hub</h2><h1>${fIcon(f, 'big')}${esc(F.name)}</h1>
    <p class="svc-line">${esc(h.name)} · lv ${h.level}</p>${repBar(s, f)}${relations(f)}
    <div class="row"><button type="button" class="btn primary" data-go="hub:${f}">Connect</button></div></section>`;
}
// The hub page: who they are, your rep, their shop, their work, their servers on your map.
// ---------- hub sessions ----------
// Connecting to a hub opens a session: who answers, one line from them, and a short menu. Each
// choice opens its own window; you never see the whole hub at once.
const VOICE = {
  halcyon: { who: 'concierge@halcyon', hostile: 'Your policy is suspended. This channel is monitored.', low: 'Welcome back, contractor. Keep your claim number ready.', mid: 'Good to see you, contractor. Your file is in order.', high: 'Preferred client. The clearing house is at your disposal.' },
  glassjaw: { who: '—@glassjaw', hostile: 'You burned us. Talk is expensive now.', low: "Don't know you. Don't need to.", mid: 'You again. Good. Quiet work pays.', high: 'Inner circle. Whatever you need, it never happened.' },
  kestrel: { who: 'helpdesk@kestrel', hostile: 'Ticket #0000 closed: account blacklisted.', low: 'Ticket opened. Estimated wait: forever.', mid: 'Ticket opened. Priority: client.', high: 'Key account. Routing you to a human. Kidding.' },
  lantern: { who: 'ops@lantern', hostile: "…static. We're not broadcasting for you.", low: "You're on the frequency. Listen first.", mid: 'Regular on the dial. What do you need?', high: "Signal's strong. You're one of us." },
  nullchoir: { who: 'vesper@nullchoir', hostile: 'Marked. Say your piece and get off our wire.', low: 'Outsider. Corporate smell on you. Make it quick.', mid: "Fellow. The choir's listening.", high: 'Cantor. Sing and we follow.' },
};
const MARK = {
  halcyon: ['  .-""""-.  ', ' /  |  |  \\ ', ' \\  |--|  / ', "  '-.__.-'  "],
  glassjaw: [' \\  /\\  /  ', '  \\/  \\/   ', '  /\\  /\\   ', ' /  \\/  \\  '],
  kestrel: [' __      __ ', '   \\_  _/   ', '     \\/     ', '    (__)    '],
  lantern: ['    _||_    ', '   |    |   ', '   | () |   ', '   |____|   '],
  nullchoir: ['    .--.    ', '   / / \\    ', '  | / / |   ', '   \\/__/    '],
};
function greeting(s, f, now) {
  const V = VOICE[f], h = hubOf(s, f);
  if (captured(s, f)) return { who: `${s.profile?.handle || 'root'}@${h.name.toLowerCase()}`, line: lockedDown(s, f) ? 'Locked out of my own box. Get me back in.' : retakeOf(s)?.f === f ? 'They want it back. Incoming.' : 'Root shell. Yours.' };
  if (offline(s, f, now)) return { who: V.who, line: '— no carrier —' };
  const t = repTier(s, f).i;
  return { who: V.who, line: hostile(s, f) ? V.hostile : t >= 3 ? V.high : t >= 2 ? V.mid : V.low };
}
// What the session offers right now: [{ key, label, meta }]. Typed numbers pick from this.
export function hubOptions(s, f, now = Date.now()) {
  if (!FX[f] || !hubOf(s, f)) return [];
  const theirs = s.locations.filter((l) => l.faction === f).length, offers = mailOffers(s).filter((o) => (o.faction || 'halcyon') === f).length;
  const servers = { key: 'servers', label: 'Their servers', meta: `${theirs}` };
  const pay = { key: 'payloads', label: 'Payloads', meta: `${glyph('firewall')}${defenceOf(s, f, now)}` };
  if (captured(s, f)) return [{ key: 'hold', label: 'Your hub', meta: `${glyph('credits')}${bankOf(s, f)}` }, { key: 'market', label: 'Market', meta: `⇄ ${Math.round(travelMs(s, f) / 60000)}m` }, { key: 'shop', label: 'Shop', meta: 'at cost' }];
  if (hostile(s, f)) return [...(PAYLOAD.on ? [pay] : []), ...(f !== 'halcyon' ? [{ key: 'donate', label: 'Donate', meta: donationOf(s, f).x > 1 ? `×${donationOf(s, f).x.toFixed(1)}` : '' }] : []), servers];
  if (offline(s, f, now)) return [...(PAYLOAD.on ? [pay] : []), servers];
  return [
    { key: 'market', label: 'Market', meta: `⇄ ${Math.round(travelMs(s, f) / 60000)}m` },
    { key: 'shop', label: 'Shop', meta: f === 'halcyon' ? 'instant' : `${shopOf(s, f, now).filter((g) => !g.locked && g.left).length}` },
    { key: 'work', label: 'Work', meta: `${offers}` },
    ...(PAYLOAD.on ? [pay] : []),
    ...(f !== 'halcyon' && donationOf(s, f).open ? [{ key: 'donate', label: 'Donate', meta: donationOf(s, f).x > 1 ? `×${donationOf(s, f).x.toFixed(1)}` : '' }] : []),
    servers,
  ];
}
// A faction's Shop: its own shelf as tiles, like Halcyon's store (Halcyon's Shop is its store).
function shopMarkup(s, f, now) {
  const F = FX[f];
  if (hostile(s, f) || offline(s, f, now)) return '<p class="quiet">Shut to you.</p>';
  const tiles = shopOf(s, f, now).map((g) => {
    const can = !g.locked && g.left > 0 && s.server.credits >= g.price;
    return `<li class="ptile stash${g.locked ? ' locked' : ''}"><b class="iname">${glyph(g.id === 'bootleg' ? 'firewall' : GLYPH_OF_GOOD[g.id] || 'crate', 'badge')}${esc(g.name)}</b><small>${esc(g.about)}</small>
      <div class="ptile-acts"><span class="price">${g.price} credits</span><small class="qty">×${g.left}</small>${g.locked ? `<span class="tag dim">${esc(F.tiers[g.need])}</span>` : `<button type="button" class="btn small ${can ? 'primary' : ''}" data-command="buy ${f} ${g.id}" ${can ? '' : 'disabled'}>Buy</button>`}</div></li>`;
  }).join('');
  return `<ul class="ptiles stash">${tiles || '<li class="quiet">Nothing on the shelf.</li>'}</ul>`;
}
function workMarkup(s, f) {
  const offers = mailOffers(s).filter((o) => (o.faction || 'halcyon') === f);
  const held = (s.mail?.jobs || []).filter((j) => !j.done && (j.faction || 'halcyon') === f && j.story === undefined);
  return `${offers.length ? `<ul class="craft-list">${offers.map((o) => `<li><span><b title="${esc(contractTitle(s, o))}">${esc(o.subject)}</b><small class="cost">${esc(rewardLine(s, o))}</small></span><button type="button" class="btn primary small" data-command="mail accept ${o.id}">Take</button></li>`).join('')}</ul>` : '<p class="quiet">Nothing posted.</p>'}
    ${held.length ? `<h3 class="craft-sub">Yours</h3><ul class="craft-list">${held.map((j) => `<li><span><b>${esc(contractTitle(s, j))}</b><small>${esc(contractProgress(s, j).text)}</small></span><button type="button" class="btn small" data-go="mail:${j.id}">Mail</button></li>`).join('')}</ul>` : ''}`;
}
function serversMarkup(s, f) {
  const theirs = s.locations.filter((l) => l.faction === f);
  return theirs.length ? `<ul class="craft-list">${theirs.map((l) => `<li><span><b>${esc(l.name)}</b><small>lv ${l.level} · layer ${l.depth || 1}</small></span><button type="button" class="btn small" data-go="map:${esc(l.id)}">Map</button></li>`).join('')}</ul>` : '<p class="quiet">None on your map.</p>';
}
const WINDOWS = {
  market: { title: 'Market', body: (s, f, now) => marketMarkup(s, f, now) },
  shop: { title: 'Shop', body: (s, f, now) => (f === 'halcyon' ? storeMarkup(s, now) : shopMarkup(s, f, now)) },
  work: { title: 'Work', body: (s, f) => workMarkup(s, f) },
  payloads: { title: 'Payloads', body: (s, f, now) => payloadMarkup(s, f, now) },
  donate: { title: 'Donate', body: (s, f) => donateMarkup(s, f) },
  hold: { title: 'Your hub', body: (s, f, now) => holdMarkup(s, f, now) },
  servers: { title: 'Their servers', body: (s, f) => serversMarkup(s, f), tip: (f) => `Open a vault: ${FX[f].short} −${OWNED.takeoverHit}, its rivals +${Math.round(OWNED.takeoverHit * 0.5)}` },
};
// The session is a terminal, like jacking into any server: an ssh handshake, the hub's banner,
// whoever answers, and its menu as tokens you can type or click. A choice opens its window beside.
export const hubHost = (s, f) => hubOf(s, f)?.name.toLowerCase() || f;
export function hubMenuLine(s, f, now = Date.now(), win = null) {
  const opts = hubOptions(s, f, now);
  const row = (n, label, meta, attr, on = false) => `<button type="button" class="hub-row${on ? ' on' : ''}" ${attr}><span class="hn">${n}</span><span class="hl">${esc(label)}</span><span class="hm">${meta || ''}</span></button>`;
  return { cls: 'hub-menu', html: opts.map((o, i) => row(i + 1, o.label.toLowerCase(), o.meta, o.key === 'store' ? 'data-go="store"' : `data-hub-opt="${o.key}"`, o.key === win)).join('') + row(0, 'disconnect', '', 'data-hub-close') };
}
// The lines a connection prints, in order: handshake, banner, who answers, the menu.
export function hubBanner(s, f, now = Date.now()) {
  const F = FX[f], h = hubOf(s, f), g = greeting(s, f, now), t = repTier(s, f);
  const handle = esc(s.profile?.handle || 'rookie');
  return [
    { cls: 'you', html: `ssh ${handle}@${esc(hubHost(s, f))}` },
    { cls: 'note', html: `Connecting to ${esc(h.name)} … ⇄ ${Math.round(travelMs(s, f) / 60000)} min` },
    { cls: offline(s, f, now) ? 'bad' : hostile(s, f) && !captured(s, f) ? 'warn' : 'good', html: offline(s, f, now) ? 'NO CARRIER' : hostile(s, f) && !captured(s, f) ? 'Connected. Filtered.' : 'Connected.' },
    { cls: 'hub-banner', html: `<pre class="hub-ascii" aria-hidden="true">${MARK[f].map(esc).join('\n')}</pre><span class="hub-motd"><b>${esc(F.name)}</b><span class="tag dim">lv ${h.level}</span>${captured(s, f) ? '<span class="tag you">yours</span>' : `<span class="tag" title="Rep ${rep(s, f)}">${esc(t.name)}</span>`}</span>` },
    { cls: 'hub-say', html: `<b>${esc(g.who)}:</b> ${esc(g.line)}` },
    hubMenuLine(s, f, now),
  ];
}
// lines: the session's transcript so far (app.js keeps it). win: the open window, if any.
export function hubTerminalMarkup(s, f, lines, win, now = Date.now()) {
  const F = FX[f], h = hubOf(s, f);
  if (!F || !h) return '<div class="page-grid"><section class="card"><h2>Hub</h2><p class="quiet" title="Hubs open with the contract board">Locked</p></section></div>';
  const opts = hubOptions(s, f, now), W = win && opts.some((o) => o.key === win) ? WINDOWS[win] : null;
  const term = `<section class="panel net-one hub-term" data-pane="ssh ${esc(s.profile?.handle || 'rookie')}@${esc(hubHost(s, f))}">
    <header class="net-head"><div class="net-where">${fIcon(f)}<b>${esc(h.name)}</b></div>${repBar(s, f)}<button type="button" class="btn small" data-hub-close title="Disconnect">×</button></header>
    <ol class="term" id="hubterm">${lines.map((l) => `<li class="${l.cls}">${l.menu ? hubMenuLine(s, f, now, win).html : l.html}</li>`).join('')}</ol>
  </section>`;
  const w = W ? `<section class="card hub-win" data-keep="${esc(f + ' ' + W.title)}"><h2${W.tip ? ` title="${esc(W.tip(f))}"` : ''}>${esc(W.title)}<button type="button" class="btn small x" data-hub-opt="" title="Close">×</button></h2>${W.body(s, f, now)}</section>` : '';
  return `<div class="hub-session${W ? ' with-win' : ''}" style="--fc:${captured(s, f) ? 'var(--you)' : F.color}">${term}${w}</div>`;
}
export const hubMarkup = (s, f, now = Date.now()) => hubTerminalMarkup(s, f, hubBanner(s, f, now), null, now);
// A hub you hold: what it has earned, what it earns, and anyone coming to take it back.
function holdMarkup(s, f, now) {
  const r = retakeOf(s), mine = r && r.f === f, lock = s.hubs[f].captured.lockdown, bank = bankOf(s, f), inc = incomeOf(s, f), d = demandOf(s, f), cap = HUBS.bankHours * inc;
  const earn = `<ul class="craft-list"><li class="mk-row"><span class="mk-ware"><b class="iname">${glyph('credits', 'badge')}${bank}</b><span class="div-fill" title="${bank} of ${cap}"><span style="width:${cap ? Math.min(100, (bank / cap) * 100) : 0}%"></span></span></span><span class="mk-val">${lock || mine ? '<span class="tag hot">+0/h</span>' : `<span class="tag you" title="×${d.toFixed(2)} demand">+${inc}/h</span>`}</span><span class="mk-btns"><button type="button" class="btn small ${bank ? 'primary' : ''}" data-command="hub collect ${f}" ${bank ? '' : 'disabled'}>Collect</button></span></li></ul>`;
  const pips = (n, of) => `<span class="pips" title="${n} of ${of} left">${'◆'.repeat(n)}${'◇'.repeat(of - n)}</span>`;
  const threat = lock
    ? `<ul class="craft-list"><li class="mk-row"><span class="mk-ware"><span class="tag hot">Lockdown</span>${fIcon(f)}<span class="mk-have">lv ${lock.level}</span></span><span></span><span class="mk-btns"><button type="button" class="btn small primary" data-command="hub retake ${f}">Retake</button></span></li></ul>`
    : mine ? (() => { const left = retakeLeft(s, now), total = r.state === 'travel' ? HUBS.travelMs : HUBS.siegeMs; return `<ul class="craft-list"><li class="mk-row"><span class="mk-ware"><b class="hot">Swarm from ${esc(FX[f].short)}</b>${pips(r.ships, r.total)}<span class="mk-have">lv ${r.level}</span></span><span class="xfer-bar hot" title="${r.state === 'travel' ? 'Arrives' : 'Falls'} in ${fmtLeft(left)}"><i style="width:${Math.round((1 - left / total) * 100)}%"></i></span><span class="mk-btns"><button type="button" class="btn small primary" data-command="hub defend ${f}">${r.state === 'travel' ? 'Intercept' : 'Defend'}</button></span></li></ul>`; })() : '';
  return earn + fwRow(s, hubWall(s, f), f, FX[f].hub.level + HUBS.levelUp, now) + threat;
}
// Buying your way back toward Neutral: dearer the deeper you are.
function donateMarkup(s, f) {
  const d = donationOf(s, f), mats = materialsOf(s), ok = s.server.credits >= d.credits && (mats[d.ware] || 0) >= d.code;
  return `<ul class="craft-list"><li><span><b class="iname">${fIcon(f)}Donation</b>${needChips(s, { credits: d.credits, code: { [d.ware]: d.code } })}${d.x > 1 ? `<span class="mk-d down" title="Inflated by how deep you are">×${d.x.toFixed(1)}</span>` : ''}</span><button type="button" class="btn small ${ok ? 'primary' : ''}" data-command="hub donate ${f}" ${ok ? '' : 'disabled'}>+5 rep</button></li></ul>`;
}
// Payloads against this hub: its defence, what you hold (with how each would land), compile, in flight.
const BAND = { breach: ['Breach', 'you'], siege: ['Partial', ''], blocked: ['Blocked', 'dim'] };
// A payload's power against a hub's defence: the fill, with notches where Partial and Breach begin.
const PW_SPAN = 1.5;
function powerBar(power, def, band) {
  const at = (r) => `${Math.round((r / PW_SPAN) * 100)}%`;
  return `<span class="pw-bar ${band}" title="Power ${power} · defence ${def} (±${PAYLOAD.swing * 100}% a run)"><i style="width:${at(Math.min(PW_SPAN, power / def))}"></i><u style="left:${at(PAYLOAD.bands.siege)}"></u><u style="left:${at(PAYLOAD.bands.breach)}"></u></span>`;
}
function payloadMarkup(s, f, now) {
  const def = defenceOf(s, f, now), alert = alertOf(s, f, now), off = offline(s, f, now), mats = materialsOf(s), L = hackerLevel(s);
  const head = `<div class="row mk-tags"><span class="tag" title="Defence${alert ? ` · +${alert * PAYLOAD.alertStep * 100}% from recent strikes` : ''}">${glyph('firewall')} ${def}${alert ? ' ' + '▲'.repeat(alert) : ''}</span>${off ? `<span class="tag hot" title="Offline">offline ${Math.max(1, Math.ceil((s.hubs[f].offlineUntil - now) / 60000))} min</span>` : ''}</div>`;
  const held = builtOf(s).map((p) => { const band = forecastStrike(s, p, f, now), b = BAND[band], gone = p.kind === 'backdoor' ? f === 'halcyon' : off; return `<li class="mk-row"><span class="mk-ware"><b class="iname" title="${esc(PAYLOADS[p.kind].about)}">${glyph(PAYLOADS[p.kind].code, 'badge')}${esc(PAYLOADS[p.kind].name)} #${p.id}</b>${p.armed ? `<span class="mk-have" title="Armed">${glyph('exploit')}</span>` : ''}</span><span class="mk-val">${powerBar(p.power, def, band)}<span class="tag ${b[1]}">${b[0]}</span></span><span class="mk-btns"><button type="button" class="btn small primary" data-command="payload deploy ${p.id} ${f}" ${gone ? 'disabled' : ''}>Deploy</button></span></li>`; }).join('');
  const credits = PAYLOAD.credits(L), full = builtOf(s).length >= PAYLOAD.maxBuilt, pw = PAYLOAD.power(L);
  const make = Object.entries(PAYLOADS).map(([k, P]) => {
    const ok = !full && s.server.credits >= credits && (mats[P.code] || 0) >= PAYLOAD.code && (s.salvage || []).length >= PAYLOAD.salvage;
    const band = k === 'backdoor' && !off ? 'blocked' : forecastStrike(s, { kind: k, power: pw }, f, now);
    return `<li><span><b class="iname" title="${esc(P.about)}">${glyph(P.code, 'badge')}${esc(P.name)}</b>${needChips(s, { credits, code: { [P.code]: PAYLOAD.code }, salvage: { any: PAYLOAD.salvage, need: [] } })}${powerBar(pw, def, band)}</span><span class="mk-btns"><button type="button" class="btn small ${ok ? 'primary' : ''}" data-command="payload compile ${k}" ${ok ? '' : 'disabled'}>Compile</button>${(mats.exploit || 0) >= 1 ? `<button type="button" class="btn small" data-command="payload compile ${k} exploit" ${ok ? '' : 'disabled'} title="Power ${Math.round(pw * PAYLOAD.armed)}">${glyph('exploit')}Arm</button>` : ''}</span></li>`;
  }).join('');
  const going = flyingOf(s).filter((x) => x.f === f);
  const fly = going.length ? `<h3 class="craft-sub">Uploading</h3><ul class="craft-list">${going.map((x) => { const left = Math.max(0, x.landsAt - now), pct = Math.round((1 - left / Math.max(1, x.landsAt - x.sentAt)) * 100); return `<li class="mk-xfer"><span class="mk-ware"><b class="iname">→ ${glyph(PAYLOADS[x.kind].code, 'badge')}${esc(PAYLOADS[x.kind].name)} #${x.id}</b></span><span></span><span class="xfer-bar" title="${Math.max(1, Math.ceil(left / 60000))} min"><i style="width:${pct}%"></i></span></li>`; }).join('')}</ul>` : '';
  const last = lastStrike(s), lastLine = last && last.f === f ? `<div class="row mk-tags"><span class="tag dim">Last · ${esc(PAYLOADS[last.kind].name)} #${last.id}</span><span class="tag ${BAND[last.band][1]}">${BAND[last.band][0]}</span>${last.got.map((g) => `<span class="tag you">${esc(g)}</span>`).join('')}</div>` : '';
  return `${head}${held ? `<ul class="craft-list">${held}</ul>` : ''}${fly}${lastLine}<h3 class="craft-sub">Compile${full ? ` · ${PAYLOAD.maxBuilt}/${PAYLOAD.maxBuilt}` : ''}</h3><ul class="craft-list pay-compile">${make}</ul>`;
}
// The hub's market: what it pays and asks for each ware, why (hover the arrow), and your transfers.
// The order ticket: Sell or Buy, a slider for how many, and what it comes to (app.js updates the
// numbers live while you drag, through ticketNumbers).
export function ticketNumbers(s, f, w, side, n) {
  const max = orderMax(s, side, f, w);
  if (!max) return { max: 0 };
  const q = orderQuote(s, side, f, w, Math.min(Math.max(1, n), max));
  return { max, n: q.n, total: `${q.credits >= 0 ? '+' : '−'}${Math.abs(q.credits)}`, after: q.after, each: q.first === q.last ? `${q.first}` : `${q.first} → ${q.last}`, vs: `${q.vs >= 0 ? '+' : '−'}${Math.abs(q.vs)}`, vsUp: q.vs > 0, cmd: `market ${side} ${f} ${w} ${q.n}`, minutes: q.minutes };
}
function orderTicket(s, f, w) {
  const side = order.side || 'sell', k = ticketNumbers(s, f, w, side, order.n || 1);
  const tab = (x, label) => `<button type="button" class="mk-side${side === x ? ' on' : ''}" data-mk-side="${x}" aria-pressed="${side === x}">${label}</button>`;
  const body = !k.max
    ? `<p class="mk-none">${side === 'sell' ? 'None to sell' : 'Not enough credits'}</p>`
    : `<div class="mk-slide"><input type="range" min="1" max="${k.max}" value="${k.n}" data-mk-n aria-label="How many"><b class="mk-qty" data-mk-out="n">${k.n}</b><small>/ ${k.max}</small></div>
      <div class="mk-prev">
        <span><small>${side === 'sell' ? 'You get' : 'You pay'}</small><b class="${side === 'sell' ? 'mk-plus' : ''}" data-mk-out="total">${k.total}</b></span>
        <span><small>Each</small><b data-mk-out="each">${k.each}</b></span>
        <span title="Against the same order at the other hubs you can reach (on average)"><small>vs elsewhere</small><b class="${k.vsUp ? 'up' : ''}" data-mk-out="vs">${k.vs}</b></span>
        <span><small>Credits after</small><b data-mk-out="after">${k.after}</b></span>
      </div>
      <button type="button" class="btn primary mk-go" data-command="${k.cmd}" data-mk-out="cmd" title="Arrives in ${k.minutes} min">${side === 'sell' ? 'Sell' : 'Buy'} <span data-mk-out="n2">${k.n}</span></button>`;
  return `<div class="mk-ticket"><div class="mk-sides">${tab('sell', 'Sell')}${tab('buy', 'Buy')}</div>${body}</div>`;
}
function marketMarkup(s, f, now) {
  if (hostile(s, f)) return '<p class="quiet">Shut to you.</p>';
  if (offline(s, f, now)) return '<p class="quiet">Offline.</p>';
  const cond = CONDITIONS[HUB_CONDITION[f]], ev = eventOf(s), mats = materialsOf(s);
  const haveOf = (w) => (w === 'salvage' ? (s.salvage || []).length : mats[w] || 0);
  const min = Math.round(travelMs(s, f) / 60000);
  const rows = WARE_IDS.map((w) => {
    const q = quote(s, f, w), n = haveOf(w), lot = Math.min(10, n);
    // Its value here against the average across every hub: the one number that says where to sell.
    const avg = FACTION_IDS.reduce((a, g) => a + quote(s, g, w).sell, 0) / FACTION_IDS.length, d = Math.round((q.sell / avg - 1) * 100);
    const why = [cond.mult[w] ? `${cond.name} ×${cond.mult[w]}` : '', ev.mult[w] ? `${ev.name} ×${ev.mult[w]}` : ''].filter(Boolean).join(' · ');
    const dir = d >= 3 ? 'up' : d <= -3 ? 'down' : 'flat';
    // A read-only row (click it for an order ticket): held, what it pays here (and against other
    // hubs), what it charges. The ticket opens under the row you picked.
    const open = order && order.f === f && order.w === w;
    return `<button type="button" class="mk-tr mk-row${open ? ' open' : ''}" data-mk-pick="${w}" aria-expanded="${open}">
      <span class="mk-name" title="${esc(WARES[w].name)}">${glyph(GLYPH_OF_GOOD[w])}<b>${esc(WARES[w].name.replace(/ code$/, ''))}</b></span>
      <span class="mk-num mk-held${n ? '' : ' zero'}">${n}</span>
      <span class="mk-sellp"><b class="mk-price">${q.sell}</b><span class="mk-d ${dir}" title="Against the ${Math.round(avg)}-credit average across hubs${why ? ` · ${esc(why)}` : ''}">${dir === 'up' ? '▲' : dir === 'down' ? '▼' : '='}${Math.abs(d)}%</span></span>
      <span class="mk-buyp">${q.buy}</span>
    </button>${open ? orderTicket(s, f, w) : ''}`;
  }).join('');
  const head = `<div class="mk-tr mk-th"><span>Ware</span><span class="mk-num">Held</span><span class="mk-sell-h">Sell here</span><span class="mk-buy-h">Buy here</span></div>`;
  const mine = transfersOf(s).filter((x) => x.f === f);
  const flying = mine.length ? `<h3 class="mk-sec">In transfer</h3><div class="mk-table mk-xfers">${mine.map((x) => { const left = Math.max(0, x.landsAt - now), pct = Math.round((1 - left / Math.max(1, x.landsAt - x.sentAt)) * 100); return `<div class="mk-tr">
      <span class="mk-name">${glyph(x.side === 'good' ? GLYPH_OF_GOOD[x.good] || 'crate' : GLYPH_OF_GOOD[x.w])}<b>${x.side === 'good' ? esc(x.name) : esc(WARES[x.w].name.replace(/ code$/, ''))}</b><span class="mk-dir" title="${x.side === 'sell' ? 'Outgoing' : 'Incoming'}">${x.side === 'sell' ? '→' : '←'}</span>${x.side === 'good' ? '' : `<span class="mk-sub">×${x.n}</span>`}</span>
      <span class="mk-num mk-price ${x.side === 'sell' ? 'in' : ''}">${x.side === 'sell' ? '+' : '−'}${x.credits}</span>
      <span class="xfer-bar" title="${Math.max(1, Math.ceil(left / 60000))} min"><i style="width:${pct}%"></i></span>
    </div>`; }).join('')}</div>` : '';
  return `<div class="mk-tags"><span class="tag" title="${esc(cond.about)}">${esc(cond.name)}</span><span class="tag dim" title="${esc(ev.about)}">${esc(ev.name)}</span><span class="tag dim" title="File transfer">⇄ ${min} min</span></div>
    <div class="mk-table mk-wares">${head}${rows}</div>${flying}`;
}
const GLYPH_OF_GOOD = { relay: 'relay', cracker: 'cracker', injector: 'injector', signal: 'signal', repair: 'repair', cipher: 'cipher', worm: 'worm', kernel: 'kernel', exploit: 'exploit', salvage: 'salvage', crate: 'crate', blueprint: 'blueprint', daemon: 'daemon' };

// Your first class, picked right after you log in: what each one is for, its passive and its first
// two skills. Switching is free until a class reaches LOADOUT.trialUntil (your level comes along).
export function classPickMarkup(s) {
  const cards = Object.entries(ARCHETYPES).map(([k, a]) => {
    const first = a.skills.slice(0, 2).map((x) => `<li title="${esc(x.rule || '')}"><b>${esc(x.name)}</b> <small>${esc(ABILITIES[x.id]?.short || '')}</small></li>`).join('');
    return `<button type="button" class="cp-card" data-pick-class="${k}"><span class="cp-name">${esc(a.name)}</span><span class="cp-role">${a.role.map((r) => `<span class="tag you">${esc(r)}</span>`).join('')}</span><span class="cp-passive" title="${esc(a.passive.rule)}">${esc(a.passive.name)}</span><ul class="cp-skills">${first}</ul></button>`;
  }).join('');
  return `<div class="cp-box" role="dialog" aria-label="Pick your class"><h2>Pick your class</h2><div class="cp-grid">${cards}</div><p class="cp-note">Switch on the Loadout page until level ${LOADOUT.trialUntil}. Your level comes with you.</p></div>`;
}

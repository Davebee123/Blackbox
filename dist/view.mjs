// Markup builders. Pure functions of state; they never change it.
import { SALVAGE_COSTS, stacks as salvageStacks, canAfford, costLabel as salvageLabel, payProblem, total as salvageTotal, slug } from './salvage.mjs';
import { glyph } from './glyphs.mjs';
import { TELL_ICON } from './recap.mjs';
import { glyphMarkup } from './protocol-glyphs.mjs';
import { isLive, liveCount, memoryCap, memoryCost, joinCost, MEMORY } from './memory.mjs';
// The server whose Connect is waiting on a yes (app.js): its card shows the memory it takes.
let memAsk = null;
export const setMemAsk = (id) => { memAsk = id; };
import { hubWall, HUBS, retakeOf, retakeLeft, lockedDown, incomeOf, bankOf, demandOf } from './hubs.mjs';
import { PAYLOADS, PAYLOAD, builtOf, flyingOf, lastStrike, defenceOf, alertOf, offline, forecastStrike } from './payload.mjs';
import { WARES, WARE_IDS, CONDITIONS, HUB_CONDITION, eventOf, quote, priceOf, travelMs, transfersOf, orderQuote, orderMax } from './market.mjs';
// The market's open order ticket (app.js): { f, w, side, n }.
let order = null;
export const setOrder = (o) => { order = o; };
import { PIECES, PARTS, pieceState, isFactionPiece, pendingClaims, appraisedOf, cleanStacks } from './faction-gear.mjs';
import { FACTIONS as FX, FACTION_IDS, rep, repTier, REP_TIERS, hubsOf, hubOf, shopOf, hostile, OWNED, captured, donationOf, hubFound, hubTraceOf } from './factions.mjs';
import { GLYPHS } from './glyphs.mjs';
import { SKILL_TEXT } from './lore.mjs';
import { ruleHtml } from './ruletext.mjs';
import { postsOf, siteLabel, sizeOf as serverSize, PROGRAMS, programsOn, codebasesOf, shopCodebases, codebaseName, programCost } from './sockets.mjs';
import { ABILITIES, CONFIG, FAMILIES, MUTATIONS, TICKER, QUIRKS, DAEMONS, STRAINS, GUARDS, BOSSES, HOT_RUN, STRAIN_NATIVE, DAEMON_BANDS, bandDaemons, daemonWhen, daemonBand, FLOORS, bandOf, floorOfLayer } from './data.mjs';
import { GENES, CATS, AXES } from './genes.mjs';
import { AUTHORS } from './authors.mjs';
import { PUZZLES } from './puzzles.mjs';
import { chipOf, virusGenes, scannedDeep, scannedRead, packedChip, packsGene } from './genome.mjs';
import { mastered, RESEARCH, TIER } from './research.mjs';
import { SFX, levelOf as sfxLevel } from './screenfx.mjs';
// A loud run (connect <server> loud): what the button and the run tag say on hover.
const LOUD_TIP = `Go in loud: every fight on this run has ${Math.round((HOT_RUN.hp - 1) * 100)}% more Integrity and hits ${Math.round((HOT_RUN.dmg - 1) * 100)}% harder. Every kill pays ${Math.round((HOT_RUN.xp - 1) * 100)}% more XP and rolls for loot once more.`;
import { currentLocation, takeable, takenOf, liveSpawns, zoneRooms, signalNow, zoneSpawns, TRACE } from './run.mjs';
import { ROGUE, rogueSpawns, rogueRooms, relockLeft, FARM_UNIQUES, clock as rogueClock } from './rogue.mjs';
import { eventsAt, eventsOf, eventText, eventMinutes, CARDS as EVENT_CARDS, HUNT, shockOf, hopLeft, feudShare } from './events.mjs';
import { eventCard, leakCard, toldCard, darknetCard, EVENT_ICON, FAM_GLYPH } from './event-cards.mjs';
import { matesOf, mateUp, mateSignal } from './crew.mjs';
import { momentumCap } from './classes/breaker.mjs';
import { online, inSprawl, whereText, simOn, friends, profileOf } from './presence.mjs';
import { consortiumOf, isGround, sizeOf, tiersOf, nextTier as nextConTier, serversOf, memberServers, memberLevel, CONSORTIUM, rebooting, consortiumWall, alertsOf, tiersOf as conTiers } from './consortium.mjs';
import { FACTIONS, MAIL, TIERS, openContracts, doneContracts, offers as mailOffers, findJob, heldCount, boardOpen, indemnity, tierIndex, standing, tierOf, nextTier, retainer, unread, title as contractTitle, progress as contractProgress, rewardLine, ready as contractReady, nextPayIn } from './mail.mjs';
import { commsOf } from './comms.mjs';
import { LINE, GOODS, storeOf, lineName, lineAbout, goodsAbout, priceNow } from './store.mjs';
import { shownHidden, flagged as hiddenFlagged, items as kitOf, HIDDEN, leadOf, knowsRelay, relayCost, canBuildRelay, connectedTo, viaName } from './hidden.mjs';
import { floorsOf, graphOf, locAt, hiddenAt, exitOpen, floorOfSlot, floorName, FLOOR, canDescend, waypointOf } from './floors.mjs';
import { ROOT, ROOT_PERKS, rootOf, rootProgress, procOf, freeOfMemory } from './root.mjs';
import { FIREWALL, fwOf, fwAt, ratingAt, effLevel, wallBonus, fragLevels, defragging, hardenLeft, upgradeCost, canPay, defragMs, defragCost, perksAt, TIER_PERKS, BASE_GAP, baseOf, tierOf as fwTierOf, fwLevel, hardenCost } from './firewall.mjs';
import { filtersOf, equipped as filtersOn, slotsOf as filterSlots, filterLine, FILTER_STATS, CRAFTABLE, filterCost, FILTER_CAP, baseName as filterBase, filterRecipes } from './filters.mjs';
import { situationOf } from './situations.mjs';
import { SETS, setOf, setCard, activeSets, piecesOf, greenOf, sourceText, seesRare, tierLine } from './sets.mjs';
import { tellTip, gearLive, cycleGear, gearOnParts, partTip, partCue, partRead, partLinks, lockOf, wardOf, GEAR_ICON, DAMPED, answerLine } from './fightread.mjs';
import { cutsNow, crossBy, BOSS_RULES, TICKS } from './interrupt.mjs';
import { programMarkup, progNow, progTarget, progText, progOnPart, progExc, progFight, progTag } from './routines-view.mjs';
import { unlocked as routinesOpen, LOCKED as ROUTINES_LOCKED } from './routines.mjs';
import { bodyTags } from './families.mjs';
import { heatOf } from './parts.mjs';
import { wallRating, wallBands, ratioOf, outcome, chipRate, grindRate, fighting, degradedLeft, fmtLeft, bountyOf, tellOf, quirkLine, labelOf, verdictOf, wallLevelOf, strength, streakOf, streakMult, STREAK, SCOUT, daemonChance, SCOUTED, KINDS as INV_KINDS, scoutedLine, sendTop, countsAt, wallSafety } from './invasion.mjs';
import { RULES, LOOT, SLOTS, BASES, STATS, GROUPS, RARITIES, RARITY_ORDER, ZERO_DAYS, STASH_CAP, PROTOCOL_SLOTS, PROTOCOL_STATS, SERVICES, MATERIALS, statLine, itemLabel, fmtStat, sideStats, BLUEPRINTS, PROTOCOL_NAMES, recipeStat, SLOT_KINDS, groupOf, codeOf, uniqueItem, seeded, IMPLICITS } from './gear.mjs';
import { raidIntents, raidMarks, raidOf, attackTarget } from './raid.mjs';
import { EMBLEMS } from './class-emblems.mjs';
import { ARCHETYPES, CANTRIPS, EDGE, SYNC, STATUSES, LOADOUT, TREE, SERVER, SKILLS, xpToNext, unlockLevel, power, SUBS, SUBCLASS, skillOrder, barSlots, isRunSkill } from './data.mjs';
import { XP_KINDS, xpFor, cooldownOf, subOf, subPicked, kitTalent, specRule, skillBase, knowsPart, codexKey, previewDamage, ignoresArmor, armorTakes, parse, blocked, attackAmount, drawingFire, momentumStacks, momentumBonus, topUpCost, UNIQUES, bossChance, listenBoost, effectLine, implicitText, paceOf, keyMap, barKeys, classOf, CANTRIP_IDS, hackerOf, hackerLevel, nextUnlock, serverLevel, serverClass, daemonSlots, procOpen, slottedDaemons, daemonNext, talentPoints, loaded, loadedOn, slotCount, maxSignal, compileCost, materialsOf, gearStat, critChance, critMultiplier, missChance, enemyMissChance, defense, powerOf, levelGap, zeroDay, rootkitReady, picksOf, ranksOf, freeSlot, rigOf, stashItem, knows, knownRecipes, pointsSpent, tierState, rowState, spentAbove, knownSkills, equippedSkills, cycleLength, familyInfo, defender, healCap, active, alive, virusIntegrity, armorLeft, intents, patches, readyIn, timersHidden, part, daemonLevel, packed, limitOf, asleep, frozenNow } from './combat.mjs';
import { sigOf, named, lairOf, intelOf, knowsStrain, knowsEvent, knowsRich, nameOf, NETWORK, nativeChance, homeName, isNative, whoLabel, homeOf, netSeedOf, knownNets, NATIVE_POOL, awayChance } from './network.mjs';
import { guardSetChance, lairChance, bossOdds, presetsOf, presetKeys, followOf, spikeName, said, mutated, capstonePoints, capPickOf, capState } from './combat.mjs';
import { cantripsOf } from './data.mjs';
import { daemonText } from './daemons.mjs';
import { ROOMS as ROOMS_FP, kindRule, KIND_OF } from './floorplan.mjs'; // a server card's respawn timers, its type's rule
import { threadRows, threadReader, tempNodes, tempNodeSvg, tempCard, serverMarkSvg, transitNodes, transitSvg } from './threads-view.mjs';
import { threadById, serverMarks } from './threads.mjs';
import { skillsTabMarkup } from './skills-view.mjs';
import { achievementsMarkup } from './achievements-view.mjs';
import { casingPageMarkup } from './casing-view.mjs';
import { terminalPageMarkup } from './terminal-view.mjs';
import { pointsOf } from './achievements.mjs';
export { skillDetailMarkup, breakoutMarkup, breakoutDetailMarkup, breakoutDue, breakoutLevels } from './skills-view.mjs';

// WoW-style level colors: how an enemy's level compares with yours.
export const conClass = (gap) => (gap >= 5 ? 'con-red' : gap >= 3 ? 'con-orange' : gap >= -2 ? 'con-yellow' : gap > -10 ? 'con-green' : 'con-gray');
// A short code for an attack when its name won't fit (Surge → SRG, Encrypt → ENC): never an ellipsis.
// Name and effect together too wide for a narrow cell: show the code instead of clipping the name.
const longChip = (i) => i.name.length > 6 || i.name.length + String(effectLabel(i)).length > 14;
export const attackCode = (name = '') => (name[0] + name.slice(1).replace(/[aeiou\s'-]/gi, '')).slice(0, 3).toUpperCase();
export const levelTag = (s, level, label = `Level ${level}`) => `<b class="${conClass(level - hackerLevel(s))}" title="${level > hackerLevel(s) ? `${level - hackerLevel(s)} levels above you` : level < hackerLevel(s) ? `${hackerLevel(s) - level} levels below you` : 'your level'}">${label}</b>`;
// Skill text with this level's numbers: every level adds 4% to damage and shields. Heals you cast and
// damage over time (burn ticks, helpers) take CONFIG.healLevel / dotLevel of that; heals times Restore, and
// Payload adds its flat number to every burn tick and helper hit.
export function scaledText(s, id, text, arch = null) {
  const a = ABILITIES[id];
  const k = arch ? power(hackerLevel(s, arch)) : powerOf(s);
  const kHeal = (1 + (k - 1) * CONFIG.healLevel) * (1 + gearStat(s, 'restore') / 100);
  const kDot = 1 + (k - 1) * CONFIG.dotLevel, pay = gearStat(s, 'payload');
  if (!a || !text || (k === 1 && kHeal === 1 && kDot === 1 && !pay)) return text;
  const healing = a.verb === 'heal' || id === 'patch';
  const factor = { heal: kHeal, drain: kHeal, tick: healing ? kHeal : kDot, helper: kDot }, plus = { tick: healing ? 0 : pay, helper: pay }; // Payload: flat, on each tick and helper hit
  // a.scales: the extra numbers a subclass skill writes in its text (dist/classes), as fields to scale.
  const nums = ['damage', 'heal', 'shield', 'tick', 'helper', 'all', 'cap', 'floor', ...(a.scales || [])].map((f) => [a[f], factor[f] ?? k, plus[f] || 0]).filter(([n]) => typeof n === 'number' && n > 1);
  if (id === 'counter') nums.push([SKILLS.fixedCounter, k, 0]);
  if (id === 'hook') nums.push([SKILLS.hooked, k, 0]);
  let out = text;
  const seen = new Set();
  for (const [n, f, add] of nums) if (!seen.has(n) && seen.add(n)) out = out.replace(new RegExp(`(^|[^\\d.×])${n}(?![\\d%]| cycles)`, 'g'), (m, pre) => `${pre}${Math.max(1, Math.round(n * f + add))}`); // not a count of cycles (Heartbeat: 4 a cycle for 4 cycles)
  return out;
}

// A strain's name (its rule on hover) and its live state: keystrokes logged, asleep.
function strainTags(s, v) {
  const ice = GUARDS[v.family]?.ice && GUARDS[v.family];
  if (ice) return ` <span class="tag tag-strain" data-strain="${v.family}" title="${esc(`${ice.name}: ICE. ${ice.rule}${answerLine(ice.answer)}`)}">${esc(ice.name)} ICE</span>`;
  const st = v.strain && STRAINS[v.strain];
  if (!st) return '';
  const e = s.encounter;
  const logger = v.parts.find((p) => p.syncOnly && p.integrity > 0);
  const fighting = e?.phase === 'active';
  const shade = v.parts.find((p) => p.phase && p.integrity > 0);
  const live = logger && fighting ? ` · ${e.keylog || 0}/3 logged` : v.dormant ? ' · asleep' : shade && fighting ? (e.cycle % 2 ? ' · out of phase' : ' · in phase') : '';
  const hot = logger && (e?.keylog || 0) >= 2;
  return ` <span class="tag tag-strain${hot ? ' hot' : ''}" data-strain="${v.strain}" title="${esc(`${st.name}: ${familyInfo(v.family).name} strain. ${st.rule}${answerLine(st.answer)}`)}">${esc(st.name)}${live}</span>`;
}
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICON = { damage: 'server', encrypt: 'event-lock', scramble: 'scan', replicate: 'mutation', heal: 'shell-shield', mirror: 'interrupt', reboot: 'pulse-node', deliver: 'loot', unpack: 'mutation', redeploy: 'pulse-node', fuse: 'event-warning', buffer: 'shell-shield', thaw: 'event-warning', boot: 'pulse-node' };
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const effectLabel = (i) => (i.effect === 'damage' ? `−${i.amount}` : i.effect === 'fuse' ? `−${i.amount}` : i.effect === 'buffer' ? `+${i.amount}` : i.effect === 'thaw' ? 'joins' : i.effect === 'boot' ? `${i.amount} hp` : (i.hit ? `−${i.hit} · ` : '') + (i.effect === 'encrypt' ? `+${i.amount}` : i.effect === 'scramble' ? `${i.amount} cyc` : i.effect === 'heal' ? `+${i.amount} hp` : i.effect === 'mirror' ? `${i.amount}% back` : i.effect === 'reboot' || i.effect === 'redeploy' ? `${i.amount} hp` : i.effect === 'deliver' ? '+box' : i.effect === 'unpack' ? `${i.amount} drop` : '+frag'));
const TARGETS = { damage: 'Integrity', encrypt: 'damage every cycle, stacking, until it breaks', scramble: 'your attacks may hit you', replicate: 'spawns a fragment', heal: 'to its most damaged part', mirror: 'your command does nothing this cycle, and some bounces back', reboot: 'comes back, unless its twin is broken first', deliver: 'a Package on the board', unpack: 'two Droppers', redeploy: 'the Courier comes back, unless the Loader is broken first', thaw: 'it thaws at the end of this cycle and joins the fight', boot: 'it boots with the signature\'s attack, unless you break it first' };
let runMode = false;
const effectTarget = new Proxy(TARGETS, { get: (t, k) => (k === 'damage' && runMode ? 'Signal' : t[k]) });

// Armor chits on a part: filled = still there, hollow = broken.
// breaking: chits this cycle's hits will break (the forecast); they blink, like the white slices.
export function chitsMarkup(p, breaking = 0) {
  if (!p.maxArmor) return '';
  const going = Math.min(breaking, p.armor);
  return `<span class="chits" title="Armor: ${p.armor} of ${p.maxArmor}.${going ? ` ${going} breaks this cycle.` : ''} A hit on armor does no damage and breaks one ◆. Hits that ignore armor go through.">${'◆'.repeat(p.armor - going)}${going ? `<b class="going">${'◆'.repeat(going)}</b>` : ''}<i>${'◇'.repeat(p.maxArmor - p.armor)}</i></span>`;
}
const VEIL_NOTE = 'Veiled: hides its timers while it wears ◆.\n▸ Strip its ◆, or Tag it to see its timer.';
const hiddenNote = (s) => {
  const e = s.encounter;
  return VEIL_NOTE;
};

export function headMarkup(s) {
  const e = s.encounter, v = e.virus;
  const m = v.mutation ? MUTATIONS[v.mutation] : null;
  const weak = v.weakKnown ? part(s, v.weakPoint) : null;
  const status = e.phase === 'active' ? (e.paused ? '<span class="tag">Paused</span>' : '') : `<span class="tag ${e.phase === 'crashed' ? 'hot' : ''}">${esc(e.phase === 'alert' ? 'Not engaged' : e.phase)}</span>`;
  return `<h1>${esc(v.name)}${byline(v)}</h1>
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
  if (e.lastAttack) return `<div class="intent mine" title="Nothing typed: you ${esc(spikeName(s))} the last part you hit"><b>You:</b> ${esc(said(s, e.lastAttack))} <small>auto</small></div>`;
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
      .map((i) => `<div class="intent ${c === 0 ? 'now' : c === 1 ? 'next' : ''}${i.held ? ' held' : ''}" title="${esc(i.name)} from ${esc(part(s, i.source)?.name)}: ${effectLabel(i)} ${effectTarget[i.effect]}${heldTip(i)}"><span class="ico" ${icon(ICON[i.effect])}></span>${heldMark(i)}<b${longChip(i) ? ' class="long"' : ''}>${esc(i.name)}</b><i class="code${longChip(i) ? ' long' : ''}">${esc(attackCode(i.name))}</i><small>${effectLabel(i)}</small></div>`)
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
// A Mutex's lock takes the hit first (shield: the slice blinks on the lock's segment instead), and a Lockbox's ward
// stops it at what the cap has left this cycle (combat.mjs hit).
// preview: what you're typing (app.js), counted instead of your queued command while it would go through.
export function forecast(s, preview = null) {
  const e = s.encounter, out = { parts: {}, chits: {}, shield: {}, total: 0, you: 0, mates: {} };
  if (!active(s)) return out;
  const crew = e.mode === 'run' ? matesOf(s).filter((m) => m.encounter && mateUp(m)) : [];
  const armor = Object.fromEntries(e.virus.parts.map((p) => [p.id, p.armor]));
  const lockLeft = {}, wardLeft = {};
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
    let n = dmg;
    if (!(st.encounter?.buffs?.sudo >= e.cycle)) { // Sudo: the parts' rules don't hold you
      const w = wardOf(st, e.virus, p), lk = lockOf(st, e.virus, p);
      if (w) { wardLeft[p.id] ??= w.left; n = Math.min(n, wardLeft[p.id]); wardLeft[p.id] -= n; }
      if (lk) { lockLeft[p.id] ??= lk.cur; const soak = Math.min(lockLeft[p.id], n); lockLeft[p.id] -= soak; n -= soak; if (soak) out.shield[p.id] = (out.shield[p.id] || 0) + soak; }
    }
    if (n > 0) out.parts[p.id] = Math.min(p.integrity, (out.parts[p.id] || 0) + n);
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
// Halcyon's Claims (faction-gear.mjs): each claim pending as a pip past your Signal, its payout and when on hover.
const claimMarks = (s, d) => { let at = d.integrity; return pendingClaims(s).map((c) => { const w = Math.min(c.amount, Math.max(0, d.max - at)), x = at; at += w; const n = c.at - s.encounter.cycle; return w > 0 ? `<i class="claim" style="left:${(x / d.max) * 100}%;width:${(w / d.max) * 100}%" title="${esc(`${c.name}: +${c.amount} ${n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`}`)}"></i>` : ''; }).join(''); };
const lossMark = (now, max, loss) => (loss > 0 && max > 0 ? `<i class="loss" style="left:${((now - loss) / max) * 100}%;width:${(loss / max) * 100}%" title="−${loss} this cycle"></i>` : '');

// In a breach, healing stops at the Signal you came into the fight with: the bar past it is fenced off.
// A Bad Block (the parts plan's P2): the cells your next heals would fill are cracked, as far as it eats.
const crackMark = (s, d) => { const bb = s.encounter?.badBlock; if (!(bb?.left > 0) || d.integrity >= d.max) return ''; const w = Math.min(bb.left, d.max - d.integrity); return `<i class="cracked-cells" style="left:${(d.integrity / d.max) * 100}%;width:${(w / d.max) * 100}%" title="${esc(`${bb.name}: your next heals lose up to ${bb.left}. Purge, Scrub, Rollback or Rotate Keys clears it.`)}"></i>`; };
const capMark = (s, d) => { const cap = healCap(s); return cap < d.max ? `<i class="heal-cap" style="left:${(cap / d.max) * 100}%;width:${((d.max - cap) / d.max) * 100}%" title="Healing cap: ${cap}. Heals in this fight can't take you past the Signal you came in with. Rest at a defrag to raise it."></i>` : ''; };

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
  const tags = `${v.champion ? '<span class="tag tag-crew" title="Champion: an elite-grade invader, sized for one. It is tougher, gives three times the XP, and leaves a capture when it falls: a sure daemon.">★ CHAMPION</span>' : v.elite ? '<span class="tag tag-crew" title="Elite: built for a crew. It is much tougher, gives three times the XP, and drops better loot.">◆ CREW</span>' : ''}${e.invader && s.invasion?.id === e.invader ? `<span class="tag hot">invasion · ${esc(s.invasion.fromName)}</span>` : ''}${m && !geneChips(s, v) ? `<span class="tag tag-mut" data-mut="${v.mutation}" title="${esc(m.rule)}">${esc(m.name)}</span>` : ''}${strainTags(s, v)}${weak ? `<span class="tag you">weak: ${esc(weak.name)}</span>` : ''}`;
  // Yours first (what you watch): your Signal with the crew under it; the virus's total at the right,
  // over its picture.
  return `<div class="hud-left"><div class="hud-you"><div class="hud-bar mine ${level}"><div class="bar-top"><strong>${glyph(runMode ? 'signal' : 'integrity', 'bar-ico')}${mine}</strong><span>${d.integrity}<small>/${d.max}</small></span></div><div class="bigbar"><span style="width:${dp}%"></span>${capMark(s, d)}${crackMark(s, d)}${lossMark(d.integrity, d.max, fc.you)}${claimMarks(s, d)}</div>${clockMeter(s)}</div></div>${statusPanel(s)}</div>
    <div class="hud-bar enemy"><div class="bar-top"><span class="vname"><strong>${esc(v.name)}</strong>${byline(v)}<span class="meta">${levelTag(s, v.level)}${v.strain || GUARDS[v.family]?.ice ? '' : ' ' + esc(familyInfo(v.family).name)}</span></span><span>${hp.current}<small>/${hp.max}</small></span></div><div class="bigbar"><span style="width:${vp}%"></span>${lossMark(hp.current, hp.max, fc.total)}</div><p class="clock-line">${armor.max ? `<span class="chits">${'◆'.repeat(armor.current)}<i>${'◇'.repeat(armor.max - armor.current)}</i></span>` : ''}${tags}${roomBossTag(s)}${progFight(s)}</p>${geneChips(s, v)}</div>`;
}
// A Resident in a server room (interrupt.mjs BOSS_RULES): the rule it fights under, and (c)'s budget as pips.
function roomBossTag(s) {
  const e = s.encounter;
  if (!e?.rooms || !e.bossRule) return '';
  const R = BOSS_RULES[e.bossRule], pips = e.cutBudget != null ? ` <span class="cut-pips">${'●'.repeat(Math.max(0, e.cutBudget))}<i>${'○'.repeat(Math.max(0, TICKS.budget - e.cutBudget))}</i></span>` : '';
  return `<span class="tag hot boss-rule" title="${esc(`Boss rule (${e.bossRule}): ${R.name}. ${R.text}`)}">rule ${e.bossRule}${pips}</span>`;
}

// Clock Speed (gear.mjs STATS.clock, capped at 25%): a thin meter under your bar that fills each cycle by your Clock Speed
// and flashes the cycle it pays out (every cooldown ticks one extra cycle). It starts empty every fight; hidden without the stat.
function clockMeter(s) {
  const e = s.encounter, rate = gearStat(s, 'clock');
  if (!e || !rate) return '';
  const fill = Math.max(0, Math.min(100, Math.floor(e.clock || 0))), paid = e.clockPaid === e.cycle;
  const tip = `Clock Speed ${rate}%${rate >= STATS.clock.cap ? ' (max)' : ''}: the meter fills ${rate}% a cycle. At 100%, every cooldown ticks one extra cycle. It starts empty every fight.`;
  return `<div class="clock-meter${paid ? ' paid' : ''}" style="--ck:${paid ? 100 : fill}" title="${esc(tip)}" role="img" aria-label="${esc(`Clock Speed meter ${fill}%`)}"><span class="ck-ring"><i></i></span><span class="ck-k">Clock ${rate}%</span></div>`;
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
  return `<div class="hud-status"><div class="bar-top"><strong>Status</strong></div><div class="st-list">${chips || '<small class="quiet">nothing on you</small>'}</div>${gearRow(s)}</div>`;
}
// Your gear's conditional rules (fightread.mjs gearLive): a chip each, lit while its condition holds, dim while it
// doesn't, struck through once a once-a-fight one is spent. Only what you have equipped; nothing when none wait on a
// condition. app.js keeps a Sync Window rule lit while the bar is in the window, and flashes a chip when it fires.
function gearRow(s) {
  const live = gearLive(s);
  if (!live.length) return '';
  const chips = live.map((g) => `<span class="gfx k-${g.kind}${g.lit ? ' lit' : ''}${g.spent ? ' spent' : ''}" data-fx="${esc(g.id)}" data-if="${esc(g.cond)}" title="${esc(g.tip)}" tabindex="0">${glyph(GEAR_ICON[g.kind] || 'protocol', 'gfx-ico')}${esc(g.name)}</span>`).join('');
  return `<div class="hud-gear" aria-label="Gear"><span class="hg-k">${glyph('protocol', 'hg-ico')}Gear</span><span class="gfx-list">${chips}</span></div>`;
}


// A tell (tells.mjs): on its part's row, in the column it lands, never hidden. The chip is the glance: its kind and
// when it lands (NOW while its window is open), its name and number, and the answer's verb. The tooltip says the rest
// once each (fightread.mjs tellTip): what happens if it lands, and how to stop it and when. A longer window marks the
// cells before it (tellSpan).
const TELL_KICK = { charge: 'Charged', cast: 'Casting', seal: 'Sealing', mimic: 'Recording', lock: 'Locking' };
function tellChip(s, i, c, k = '', to = null) {
  const p = part(s, i.source);
  const open = i.open ?? c === 0;
  // What it does, as short as an attack chip's number.
  const what = i.tell === 'charge' ? (i.effect === 'damage' ? `−${i.amount}` : i.effect === 'encrypt' ? `+${i.amount} · burst` : i.effect === 'replicate' ? `+${i.spawn || 2} frags` : i.effect === 'scramble' ? `−${i.hit || 0} · scramble` : `+${i.amount} hp`)
    : i.tell === 'cast' ? (i.does === 'loud' ? '+35% hits' : i.does === 'grow' ? '+25% hp' : i.does === 'overclock' ? '×2 both ways' : 'faster')
    : i.tell === 'seal' ? '+◆' : i.tell === 'lock' ? 'locks a key' : 'copies you';
  // The answer as an order, without its timing: the kick line has that (NOW, or when it lands).
  const answer = i.tell === 'charge' ? `Cut${i.armored ? ` past ◆${p?.armor || 0}` : ''}`
    : i.tell === 'cast' ? 'SIGINT or cut'
    : i.tell === 'seal' ? `Strip ◆${p?.armor || 0}` : i.tell === 'lock' ? 'Feed it a cooldown' : 'Go quiet';
  const progress = '';
  return `<div class="intent tell t-${esc(i.tell)} ${c === 0 ? 'now' : ''} ${open ? 'win' : ''}" ${k ? `data-k="${esc(k)}"` : ''} title="${esc(tellTip(s, i, c, to))}">`
    + `<div class="tl-kick"><span class="ico" ${icon(TELL_ICON[i.tell])}></span><span class="tl-kind">${TELL_KICK[i.tell] || ''}</span>${open ? '<b class="tl-win">NOW</b>' : `<span class="tl-when">${c ? `in ${c}` : 'now'}</span>`}</div>`
    + `<div class="tl-main"><b>${esc(i.name)}</b><small class="tl-what">${esc(what)}</small></div>`
    + `<div class="tl-ans">▸ ${esc(answer)}${progress ? `<span class="tl-prog">${esc(progress)}</span>` : ''}</div>`
    + `${to ? `<small class="at">→ ${esc(to)}</small>` : ''}</div>`;
}
// A tell's window over more than one cycle (levels 1 to 5, an elite's or a boss's charge, a cast): a strip in each
// cell of it before the cell it lands in, lit NOW in the cycle you're in.
function tellSpan(s, i, c) {
  const now = c === 0;
  return `<div class="tl-window ${now ? 'live' : ''}" title="${esc(`${i.name}'s window${now ? ' is open now' : ` opens ${c === 1 ? 'next cycle' : `in ${c} cycles`}`}. It lands ${i.col === 1 ? 'next cycle' : `in ${i.col} cycles`}, and every cycle until then counts toward the answer.`)}">${now ? '<span class="tw-word">Window · </span>now' : 'Window'}</div>`;
}
// An attack already delayed once (combat.mjs delayAttack) wears a pause mark: no other delay moves it.
const heldTip = (i) => (i.held ? '. It is already delayed, and no other delay moves it.' : '');
const heldMark = (i) => (i.held ? `<i class="held">${glyph('stall')}</i>` : '');
// The parts plan's marks on a chip (parts.mjs): a volley's hits joined by a bracket (tap 1 of 2…), a Backlog's SYN, a
// Zip Bomb's fuse, a Buffer's next shield.
// The P2 parts' (genes.mjs): a Scraper's takes-buffs mark, a Bad Block's cracked mark, a Cold Store's thaw, a Spare's boot.
const chipCls = (i) => (i.packed ? '' : chipCls0(i)); // a packed part's chip (combat.mjs intents): no mark says what it is
const chipCls0 = (i) => `${i.taps ? ` tap t${i.tap}${i.tap === 1 ? ' first' : ''}${i.tap === i.taps ? ' last' : ''}` : ''}${i.syn ? ' syn' : ''}${i.effect === 'fuse' ? ' fuse' : ''}${i.effect === 'buffer' ? ' bufup' : ''}${i.scrape ? ' scrape' : ''}${i.bad ? ' bad' : ''}${i.effect === 'thaw' ? ' thaw' : ''}${i.effect === 'boot' ? ' boot' : ''}`;
const chipTip = (i) => (i.taps ? `\nHit ${i.tap} of ${i.taps} of one volley. A cut stops the rest, and a delay moves all of it.` : i.syn ? '\nThe skill you fire this cycle cools down 2 cycles longer.' : i.effect === 'fuse' ? '\nThe fuse goes off. A ◆ or a shield absorbs the blast. Ending the fight first puts it out.' : i.effect === 'buffer' ? '\nIts shield absorbs your commands\' hits first. Burns and helpers bypass it.'
  : i.scrape ? '\nRemoves your shield, your ◆ and your timed buffs as it lands. Gains up to 2 ◆ from them. Null Route makes it miss.\n▸ Buff after it lands, not before.' : i.bad ? '\nYour next heals lose up to 10% of your max health. Purge, Scrub, Rollback and Rotate Keys clear it.'
  : i.effect === 'thaw' ? `\nFrozen and immune to damage until then. Its first hit deals ${i.amount}, 2 cycles after it thaws.` : i.effect === 'boot' ? '\nThe signature part broke, so it boots with its attack. Drops its ◆ as it boots.\n▸ Break it before then, or once it boots.' : '');
function attackChip(i, c, k = '', to = null) {
  if (i.packed) i = { ...i, syn: false, scrape: false, bad: false, taps: 0 };
  return `<div class="intent ${c === 0 ? 'now' : c === 1 ? 'next' : ''}${i.held ? ' held' : ''}${chipCls(i)}" ${k ? `data-k="${esc(k)}"` : ''} title="${esc(i.name)}: ${effectLabel(i)} ${to ? `at ${esc(to)}` : i.packed && !['damage', 'fuse'].includes(i.effect) ? '' : effectTarget[i.effect] || ''}${heldTip(i)}${esc(i.packed ? '' : chipTip(i))}"><span class="ico" ${icon(ICON[i.effect])}></span>${heldMark(i)}<b${longChip(i) ? ' class="long"' : ''}>${esc(i.name)}</b><i class="code${longChip(i) ? ' long' : ''}">${esc(attackCode(i.name))}</i><small>${effectLabel(i)}</small>${i.syn ? '<em class="synmark">SYN</em>' : ''}${i.scrape ? `<em class="scrapemark" title="Takes your buffs">${glyph('scraper')}</em>` : ''}${i.bad ? '<em class="badmark" title="Cracks your next heals">▦</em>' : ''}${i.taps ? `<em class="tapmark">${i.tap}/${i.taps}</em>` : ''}${to ? `<small class="at">→ ${esc(to)}</small>` : ''}</div>`;
}

// What you've put on a part, as marks by its name (an icon each) and a class on its row, so a
// debuffed part reads at a glance. Exposed also hatches its bar: it's open.
const MARKS = { open: 'crit', exposed: 'crit', tagged: 'ids', hooked: 'injector', throttled: 'debuff', quarantined: 'stun', jammed: 'stun', poisoned: 'debuff', thrash: 'burn', burn: 'burn', helper: 'daemon' };
export function partMarks(s, p) {
  const e = s.encounter;
  if (!alive(p)) return [];
  // Subclass marks too (dist/classes): Jammed and Poisoned (Hijacker), Thrash (Payload).
  const out = ['open', 'exposed', 'tagged', 'hooked', 'throttled', 'quarantined', 'jammed', 'poisoned', 'thrash'].filter((k) => p[k + 'Until'] >= e.cycle);
  if ((e.burns || []).some((b) => b.target === p.id)) out.push('burn');
  if (e.helpers?.some((h) => h.target === p.id)) out.push('helper');
  return out;
}
const marksMarkup = (marks) => (marks.length ? `<span class="pmarks">${marks.map((k) => `<span class="pmark m-${k}" title="${k}">${glyph(MARKS[k])}</span>`).join('')}</span>` : '');

const an = (w) => (/^[aeiou]/i.test(w) ? 'An' : 'A');
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const list2 = list;
// Who wrote it, after its name: · TOLLGATE, in its author's colour (authors.mjs). SPRAWL-00's strays have none.
export const byline = (v) => (v?.author && AUTHORS[v.author] ? `<span class="byline" style="--ac:${AUTHORS[v.author].colour}" title="${esc(AUTHORS[v.author].style)}">· ${esc(AUTHORS[v.author].name)}</span>` : '');
// Its genes, as chips under its bar: the body's dim, what it rolled or was built with bright, ??? until seen. A
// mutation's chip carries its tip (tips.mjs .tag-mut).
export function geneChip(c, extra = '') {
  // WoW's grammar: its name, its kind on a line of its own (Attack type), what it does, then the answer, muted.
  const ax = AXES[c.axis], what = c.catName[0].toUpperCase() + c.catName.slice(1);
  const how = GENES[c.id]?.decode === 'part' ? `Reach research ${TIER.rule} on a part that carries it to learn its rule.` : GENES[c.id]?.decode === 'tell' ? 'Answer it once to learn its rule.' : 'Beat two viruses that carry it to learn its rule.';
  const title = c.packed ? `Packed: ${an(c.catName)} ${c.catName} the Packer hides until it breaks. A scan before the fight reads it.` : !c.name ? `${an(c.catName)} ${c.catName} you haven't seen.` : c.rule ? `${c.name}: ${what}\n${c.rule}${answerLine(c.answer)}` : `${c.name}: ${what}\n${how}`;
  return `<span class="gchip g-${c.src}${c.name ? '' : ' unknown'}${c.packed ? ' packed' : ''}"${c.name ? `style="--ax:${ax.colour}"` : ''} ${extra} title="${esc(title)}">${glyph(c.name ? ax.icon : CATS[c.cat].icon)}${esc(c.name ? c.name.toLowerCase() : '???')}</span>`;
}
function geneChips(s, v) {
  const genes = virusGenes(v);
  if (!genes.length) return '';
  const deep = scannedDeep(s, v), read = scannedRead(s, v);
  return `<p class="gene-line">${genes.map((g) => (packsGene(s, v, g) ? geneChip(packedChip(chipOf(s, g.id, g.src, deep, read)), 'data-packed="1"') : geneChip(chipOf(s, g.id, g.src, deep, read), GENES[g.id].mutation && g.src !== 'boss' ? `data-mut="${g.id}"` : ''))).join('')}</p>`;
}
// A scan on a run: the genome card in the terminal (genome.mjs genomeCard), and on a server's rooms the notice (app.js).
export function scanMarkup(e) {
  const c = e.card, a = AUTHORS[c.author];
  const row = (label, chips) => (chips.length ? `<div class="sc-row"><span class="sc-k">${label}</span><span class="sc-chips">${chips.map((x) => geneChip(x)).join('')}</span></div>` : '');
  return `<div class="scan-card"><div class="sc-head"><b>${esc(c.name)}</b>${a ? `<span class="byline" style="--ac:${a.colour}">· ${esc(a.name)}</span>` : '<span class="byline stray">· unsigned</span>'}<small>Lv ${c.level} · ${esc(c.strain || c.body)}${c.grade > 1 ? ` · v${c.grade}` : ''}</small></div>${a ? `<p class="sc-style">${esc(a.style)}</p>` : ''}${row('body', c.genes.filter((x) => x.src === 'core'))}${row('rolled', c.genes.filter((x) => x.src !== 'core'))}${row('tells', c.tells)}${c.deep ? `<ul class="sc-deep">${[...c.genes, ...c.tells].filter((x) => x.rule && x.state !== 'decoded').map((x) => `<li><b>${esc(x.name)}</b> ${esc(x.rule)}</li>`).join('')}</ul>` : ''}</div>`;
}
// The collection log: every unique and trophy, found or not. Hidden until your first one; one you
// haven't found shows where it comes from (a strain's name only once you've met that strain).
const collSource = (s, src) => !src ? '' : src.kind === 'sprawl' ? 'SPRAWL-00' : src.kind === 'vault' ? (src.floor ? `${floorName(src.floor)} vaults` : `Layer ${src.layer || 1} vaults`)
  : src.kind === 'lair' ? `${floorName(src.floor)} lair boss` : src.kind === 'rare' ? `${floorName(src.floor)} rare spawns` : src.kind === 'thread' ? `Threads on ${floorName(src.floor)}` : src.kind === 'puzzle' ? `${floorName(src.floor)} puzzle boards`
  : src.kind === 'raid' ? 'Crew bosses' : src.kind === 'strain' && !src.id ? 'Strain trophies'
  : src.kind === 'guard' ? `${GUARDS[src.id]?.name || src.id} guard` : src.kind === 'strain' ? (s.met?.[src.id] ? `${STRAINS[src.id]?.name} trophy` : '???')
  : src.kind === 'rogue' ? `${ROGUE.kinds[src.id]?.name || 'Rogue'} servers` : src.kind === 'story' ? 'Storyline' : src.kind === 'contract' ? 'Contract reward' : src.kind === 'store' ? 'Halcyon store'
  : src.kind === 'boss' ? (src.id === 'resident' ? 'A Resident' : BOSSES[src.id]?.name || src.id) : src.kind === 'farm' ? 'KESSLER-FARM-00 packs' : src.kind === 'invasion' ? 'Invasion captures' : '';
// A native unique's source line: the network you know it from, or just native.
const nativeSource = (s, id) => { const who = homeOf(s, id); return who ? `Native · ${nameOf(s, who)} (${whoLabel(who)})` : 'Native · another network'; };
export function collectionMarkup(s) {
  // Native uniques (network.mjs) count once they're yours to chase: found, named, or native to a network you know.
  const got = s.collection || {}, nets = knownNets(s), all = Object.values(UNIQUES).filter((u) => !isNative(u.id) || got[u.id] || named(s, u.id) || nets.some((w) => sigOf(s, w)?.uniques.includes(u.id)));
  const n = all.filter((u) => got[u.id]).length;
  if (!n) return '';
  const posts = postsOf(s), listenable = (u) => (u.sources || []).some((src) => !['story', 'contract', 'store'].includes(src.kind)) && (!isNative(u.id) || named(s, u.id));
  const rows = all.filter((u) => !setOf(u.id) && !isFactionPiece(u.id)).sort((a, b) => a.level - b.level).map((u) => { // set pieces list under Sets
    const src = (isNative(u.id) ? nativeSource(s, u.id) : collSource(s, (u.sources || [])[0])) + (u.lean ? ` · ${ARCHETYPES[u.lean]?.name || SUBS[u.lean]?.name || u.lean}` : '');
    const boss = (u.sources || []).find((x) => x.kind === 'boss')?.id;
    return got[u.id]
      ? `<li class="on" title="${esc(UNIQUES[u.id].flavour || '')}"><b class="iname r-zeroday">${esc(u.name)}</b><small>Lv ${u.level} · ${esc(src)}</small></li>`
      : `<li${s.listen === u.id && posts ? ' class="heard"' : ''}><span class="coll-q">???</span><small>Lv ${u.level} · ${esc(src)}${boss ? ` · <span class="coll-odds" title="Each kill that drops none of its uniques adds ${Math.round(bossOdds(boss).pity * 100)}%">${Math.round(bossChance(s, boss) * 100)}% a kill</span>` : ''}</small>${posts && listenable(u) ? (s.listen === u.id ? `<span class="tag hot coll-listen" title="Kills on a server running a Listening Post roll for it twice as often">listening</span>` : `<button type="button" class="act dim coll-listen" data-run="listen ${esc(u.id)}" title="Listen for it: twice as often on a server running a Listening Post">listen</button>`) : ''}</li>`;
  }).join('');
  // A set: the crew dungeon's eight, once it's on your map.
  const farm = (s.locations || []).some((l) => l.farm) ? `<p class="coll-set">KESSLER-FARM-00 · ${FARM_UNIQUES.filter((id) => got[id]).length}/${FARM_UNIQUES.length}</p>` : '';
  return `<section class="card coll-card"><h2>Collection · ${n}/${all.length}</h2><div class="sb-bar coll-bar"><i style="width:${Math.round((n / all.length) * 100)}%"></i></div>${farm}<ul class="coll">${rows}</ul>${collectionPieces(s)}${collectionSets(s)}</section>`;
}
// The parts toward a faction piece (faction-gear.mjs) as PARTS.need pips, filled for each held; the count on hover.
// next: the pip the next part fills (a feud card's reward) marked too.
export const partPips = (st, cls = '', next = false) => `<span class="part-pips${cls ? ' ' + cls : ''}" style="--fc:${FX[st.f].color}" title="${esc(`${Math.min(st.parts, st.need)} of ${st.need} parts${st.parts > st.need ? ` (${st.parts} held)` : ''}`)}" role="img" aria-label="${Math.min(st.parts, st.need)} of ${st.need} parts">${Array.from({ length: st.need }, (_, i) => `<i${i < st.parts ? ' class="on"' : next && i === st.parts ? ' class="next"' : ''}></i>`).join('')}</span>`;
// The Collection's faction pieces: one row a faction, its mark, its piece (gold once assembled) and its parts as pips.
export function collectionPieces(s) {
  const rows = Object.keys(PIECES).filter((f) => FX[f]).map((f) => {
    const st = pieceState(s, f), u = UNIQUES[st.id], tip = `${u.flavour || ''} ${FX[f].short}'s piece: a part a feud won for them, ${st.need} to assemble at ${FX[f].hub.name}.`.trim();
    return `<li class="coll-piece${st.found ? ' on' : ''}" style="--fc:${FX[f].color}" title="${esc(tip)}"><b class="iname${st.found ? ' r-zeroday' : ''}">${fIcon(f)}${esc(u.name)}</b>${partPips(st)}<small>${esc(SLOTS[BASES[u.base]?.slot]?.name || '')}${st.held ? ` · Lv ${st.held.level}` : ''}</small></li>`;
  }).join('');
  return rows ? `<h3 class="coll-sets-h coll-pieces-h">Faction pieces</h3><ul class="coll coll-pieces">${rows}</ul>` : '';
}
// Where a set piece drops, once you've found it: its source, and a guard's floor and next-kill chance (its pity).
const pieceSource = (s, u) => {
  const src = (u.sources || [])[0];
  if (src?.kind === 'guard') return `${collSource(s, src)} · floor ${floorOfLayer(src.layer || 1)}+ · <span class="coll-odds" title="${esc('The chance its next kill drops it. Each kill without one adds to it while you lack its piece.')}">${Math.round(guardSetChance(s, src.id) * 100)}% a kill</span>`;
  if (src?.kind === 'story') return `${esc(collSource(s, src))} · Lv ${u.level}`;
  return `${esc((u.sources || []).map((x) => sourceText(x, SOURCE_NAMES)).join(', '))} · Lv ${u.level}+`; // the loot plan's sources (sets.mjs)
};
const SOURCE_NAMES = { boss: (id) => BOSSES[id]?.name || id, lineage: (id) => FAMILIES[id]?.name || id, author: (id) => AUTHORS[id]?.name || id, puzzle: (id) => PUZZLES[id]?.name || id };
// The Collection's Sets (sets.mjs): one row a set, its pieces found (with where each drops) or ???. The general sets
// first, then the class sets under Tier sets, each row saying it is its class's tier set for level 50.
export function collectionSets(s) {
  const got = s.collection || {};
  const row = (set) => {
    const ids = piecesOf(set.id), have = ids.filter((id) => got[id]).length;
    const pieces = ids.map((id) => (got[id] ? `<li class="on"><b class="iname r-zeroday">${esc(UNIQUES[id].name)}</b><small>${esc(SLOTS[BASES[UNIQUES[id].base]?.slot]?.name || '')} · ${pieceSource(s, UNIQUES[id])}</small></li>` : '<li><span class="coll-q">???</span></li>')).join('');
    const tier = tierLine(set.id);
    return `<li class="coll-set-row${have === ids.length ? ' done' : ''}"><b class="set-name">${esc(set.name)} <span>${have}/${ids.length}</span></b>${tier ? `<small class="set-tier">${esc(tier)}</small>` : ''}<ul class="coll">${pieces}</ul></li>`;
  };
  const all = Object.values(SETS), general = all.filter((x) => !x.tier).map(row).join(''), tiers = all.filter((x) => x.tier).map(row).join('');
  return (general ? `<h3 class="coll-sets-h">Sets</h3><ul class="coll-sets">${general}</ul>` : '') + (tiers ? `<h3 class="coll-sets-h">Tier sets · level 50</h3><ul class="coll-sets">${tiers}</ul>` : '');
}

// What a component does and what answers it (fightread.mjs partRead), for the codex and the board. ??? until decoded.
export function partAbout(p, v = null, s = null) {
  const r = partRead(s, v || { parts: [p] }, p);
  return `${r.does}${answerLine(r.answer)}`;
}
function partTags(s, p) {
  const e = s.encounter, tags = [], pk = packed(s, e.virus, p); // a Packer standing: a rolled part's rule reads as ???
  if (pk && p.integrity > 0) tags.push(`<span class="tag packed" title="${esc('Packed: its name and rule are hidden until the Packer breaks.')}">${glyph('crate')}???</span>`);
  if (p.veiled && p.armor > 0) tags.push(`<span class="tag" title="${VEIL_NOTE}">veiled</span>`);
  if (p.exposedUntil >= e.cycle) tags.push(`<span class="tag you" title="Exposed: hits on it have a 25% higher chance to critically strike">exposed ${p.exposedUntil - e.cycle + 1}</span>`);
  if (e.virus.weakKnown && e.virus.weakPoint === p.id) tags.push('<span class="tag you" title="+50% damage for the rest of the fight">weak</span>');
  if (p.taggedUntil >= e.cycle) tags.push(`<span class="tag you" title="Tagged: burns on it deal 50% more damage, and its timer shows through a veil">tagged ${p.taggedUntil - e.cycle + 1}</span>`);
  if (p.hookedUntil >= e.cycle) tags.push(`<span class="tag you" title="Hooked: every hit on it deals 6 additional damage">hooked ${p.hookedUntil - e.cycle + 1}</span>`);
  if (p.throttledUntil >= e.cycle) tags.push(`<span class="tag you" title="Throttled: its attacks deal half damage">throttled ${p.throttledUntil - e.cycle + 1}</span>`);
  if (p.quarantinedUntil >= e.cycle) tags.push(`<span class="tag you" title="Quarantined: it takes 25% more damage while its attack waits">quarantined ${p.quarantinedUntil - e.cycle + 1}</span>`);
  if (p.phase && p.integrity > 0) tags.push(e.cycle % 2 ? '<span class="tag hot" title="Out of phase: your hits pass through it this cycle, and 15% of each command hits you">phased out</span>' : '<span class="tag you" title="In phase: takes damage this cycle">in phase</span>');
  if (p.attack?.windup && p.attack.due - e.cycle <= 2 && p.integrity > 0) tags.push(`<span class="tag hot" title="Winding up: dealing ${p.attack.windup} damage to it before it lands calls it off">wind-up ${p.attack.wound || 0}/${p.attack.windup}</span>`);
  if (p.enrage && p.integrity > 0 && p.integrity < p.max / 2) tags.push('<span class="tag hot" title="Enraged: deals 30% more damage below half Integrity">enraged</span>');
  // A Keyring's re-arm, a Mutex's lock and its relock: the tether between the rows says them (boardMarkup tethers).
  if (p.attack?.grow && p.integrity > 0) tags.push(`<span class="tag hot" title="Trace-back: deals more damage every cycle the fight lasts">+${p.attack.bonus || 0}</span>`);
  if (p.ratchet && p.integrity > 0) { const now = heatOf(p, e.cycle); tags.push(`<span class="tag hot esc" title="${esc(`${p.ratchet.name}: from cycle ${p.ratchet.from + 1}, deals damage to you every cycle, ${p.ratchet.amount} more every ${p.ratchet.every} cycles while the ${p.name} stands. Purge or Rollback starts it over.${answerLine('Break it early to end the Ratchet.')}`)}">▲ ratchet${now ? ` ${now}` : ''}</span>`); }
  if (p.echo && p.integrity > 0) tags.push('<span class="tag hot" title="Echoing: while it stands, every hit you take repeats 1 cycle later at half damage">echoing</span>');
  const ap = appraisedOf(s); // Kestrel's Appraisal (faction-gear.mjs): its next hit, and more damage to it until it breaks
  if (ap?.part === p.id && p.integrity > 0) tags.push(`<span class="tag you appraised" title="${esc(`${ap.name}: you deal ${ap.value}% more to it until it breaks.${p.attack ? ` Its next hit: ${blocked(s, attackAmount(p))}.` : ''}`)}">${glyph('f-kestrel')}${p.attack ? `−${blocked(s, attackAmount(p))}` : `+${ap.value}%`}</span>`);
  // A breach's rolled mutation lives on a part (breach.mjs): break the part and the rule ends.
  for (const id of p.integrity > 0 ? p.carries || [] : []) tags.push(`<span class="tag hot carrier" title="${esc(`${GENES[id]?.name || id}: ${GENES[id]?.does || ''} Breaking this part ends the rule.`)}">${esc((GENES[id]?.name || id).toLowerCase())}</span>`);
  // Mutations: an Adaptive part one more cycle of hits from hardening; damage a Rerouting virus moved here.
  if (mutated(s, 'adaptive') && p.integrity > 0 && p.adaptRun >= 2 && p.adaptAt === e.cycle - 1) tags.push('<span class="tag hot" title="Adapting: gains 1 ◆ at the end of this cycle if your commands hit it again">adapting</span>');
  if (p.rerouted && p.integrity > 0) tags.push(`<span class="tag hot" title="Rerouted: its attack deals ${p.rerouted} more damage, passed on from a broken part">+${p.rerouted} rerouted</span>`);
  // Parts that change the fight (data.mjs FAMILIES): a Tripwire, the C2 Node, the parts gone loud.
  if (p.deadman && p.integrity > 0 && !pk) tags.push(`<span class="tag hot" title="${esc(`Tripwire: when broken while the others stand, they go loud. Loud parts deal ${Math.round((CONFIG.tripwire.loud - 1) * 100)}% more damage and attack 1 cycle sooner.${answerLine('Break it last.')}`)}">tripwire</span>`);
  if (p.loud && p.integrity > 0) tags.push(`<span class="tag hot" title="Loud: deals ${Math.round((CONFIG.tripwire.loud - 1) * 100)}% more damage and attacks 1 cycle sooner">loud</span>`);
  // Fallback (combat.mjs): the part that takes over its partner's attack when the partner breaks first.
  if (p.fallback && p.integrity > 0) { const t = e.virus.parts.find((x) => x.id === p.fallback); if (p.tookOver) tags.push(`<span class="tag hot" title="${esc(`Took over: took over the ${t?.name || 'broken part'}'s ${t?.attack?.name || 'attack'} when the ${t?.name || 'other part'} broke.`)}">took over</span>`); else if (t && t.integrity > 0 && t.attack) tags.push(`<span class="tag hot" title="${esc(`Fallback: if the ${t.name} breaks first, the ${p.name} takes over its ${t.attack.name}.`)}">fallback</span>`); }
  // The parts plan (data.mjs BASICS, genes.mjs): an Accumulator's charge, a Hotspot's glow, the Idle Timer's countdown on
  // the signature's row, an Obfuscator's smoke.
  if (p.accum && p.attack && p.integrity > 0) { const n = Math.max(0, p.attack.due - e.cycle), k = p.attack.interval, f = Math.max(0, Math.min(k, k - n)); tags.push(`<span class="tag hot accum" title="${esc(`${p.attack.name}: lands ${n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`} and deals ${blocked(s, attackAmount(p))} damage to you.`)}">${glyph('damage')}<i class="acc-bar"><b style="width:${Math.round((f / k) * 100)}%"></b></i></span>`); }
  if (p.hotspot && p.integrity > 0 && !pk) tags.push(`<span class="tag hot hotspot" title="${esc('Hot: when your command hits it, the virus\'s next attack 2 or more cycles away becomes a charge. Burns and helpers do not set it off.')}">${glyph('burn')}hot</span>`);
  const idler = p.special && p.integrity > 0 && e.virus.parts.find((x) => x.idle && x.integrity > 0 && !packed(s, e.virus, x));
  if (idler) { const left = Math.max(0, idler.idle - (e.cycle - (e.virus.idleHit || 0))); tags.push(`<span class="tag${left <= 2 ? ' hot' : ''} idlepips" title="${esc(`${idler.name}: ${left ? `every part re-arms to full ◆ in ${left} ${left === 1 ? 'cycle' : 'cycles'}` : 'every part re-arms at the end of this cycle'} unless your command hits the ${p.name}.`)}">${glyph('clock')}${'●'.repeat(left)}<i>${'○'.repeat(Math.max(0, idler.idle - left))}</i></span>`); }
  if (p.obfuscate && p.integrity > 0) tags.push('<span class="tag" title="Smoke: while it stands, every part hides its timers, even with no ◆. Tag still reveals one.">smoke</span>');
  // The parts plan's P2: a Limiter's cap, a Spare on standby, a Damper's dropped kind, a Cold Store's thaw.
  if (p.limit && p.integrity > 0 && !pk) tags.push(`<span class="tag limcap" title="${esc(`Limiter: no single hit takes more than ${limitOf(p)} of its Integrity. Damage past the cap is lost.${answerLine('Use many small hits.')}`)}">${glyph('shield')}cap ${limitOf(p)}</span>`);
  if (asleep(p) && p.integrity > 0 && !pk) tags.push(`<span class="tag standby" title="${esc(p.bootAt ? `Booting: boots ${p.bootAt - e.cycle <= 0 ? 'at the end of this cycle' : `in ${p.bootAt - e.cycle} ${p.bootAt - e.cycle === 1 ? 'cycle' : 'cycles'}`} with the ${p.bootFrom?.name || 'signature'}'s attack. Drops its ◆ as it boots.${answerLine('Break it first, or once it boots.')}` : `Standby: sleeps under its ◆ until the signature part breaks. Then boots with its attack and drops its ◆.${answerLine('Pay for its ◆ asleep, or its Integrity once booted.')}`)}">${glyph('snapshot')}${p.bootAt ? 'booting' : 'standby'}</span>`);
  if (p.damper && p.integrity > 0 && !pk) { const k = DAMPED[p.damperKind] || DAMPED.burn; tags.push(`<span class="tag damper${p.armor > 0 ? '' : ' off'}" title="${esc(p.armor > 0 ? `Damper: while it wears ◆, immune to damage from ${k.many}. ${k.many[0].toUpperCase() + k.many.slice(1)} still break its ◆.` : `Damper: stripped. ${k.many[0].toUpperCase() + k.many.slice(1)} damage it again until its ◆ patches back.`)}">${glyph(k.icon)}<s>${esc(k.short)}</s></span>`); }
  if (frozenNow(s, p) && !pk) { const k = p.thawAt ?? p.frozen, f = Math.max(0, Math.min(1, (e.cycle - 1) / k)), n = k - e.cycle + 1; tags.push(`<span class="tag frost" title="${esc(`Frozen: off the timeline and immune to damage. Thaws ${n <= 1 ? 'at the end of this cycle' : `in ${n} cycles`}. Its first hit lands 2 cycles after the thaw.`)}">${glyph('clock')}<i class="thaw-bar"><b style="width:${Math.round(f * 100)}%"></b></i></span>`); }
  if (p.command && p.integrity > 0) tags.push(`<span class="tag hot" title="${esc(`${p.name}: fragments deal ${Math.round(CONFIG.c2.gnaw * 100)}% more damage while it stands. When it breaks, every fragment drops.`)}">commands fragments</span>`);
  const burn = (e.burns || []).filter((b) => b.target === p.id);
  // Burns, one tag per kind: the damage a cycle in all, and how many when there's more than one of a kind
  // (Inject is one a part: pressing it again refreshes it).
  for (const name of [...new Set(burn.map((b) => b.name))]) {
    const mine = burn.filter((b) => b.name === name);
    const dmg = mine.reduce((n, b) => n + b.damage, 0), left = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'} left`;
    const tip = mine.length === 1 ? `${name}: ${dmg} damage a cycle, ${left(mine[0].left)}.` : `${name}: ${mine.length} on it, ${dmg} damage a cycle in all. Cycles left: ${mine.map((b) => b.left).join(', ')}.`;
    tags.push(`<span class="tag you burn-tag" title="${esc(tip)}">${esc(name)}${mine.length > 1 ? ` ×${mine.length}` : ''} · ${dmg}</span>`);
  }
  if (e.helpers?.some((h) => h.target === p.id)) tags.push(`<span class="tag daemon" title="Your helper hits it every cycle">helper</span>`);
  for (const [text, tip, kind] of bodyTags(s, p)) tags.push(`<span class="tag ${kind}" title="${esc(tip)}">${esc(text)}</span>`); // a server room's bodies (families.mjs)
  // A packed part: no tag of its own rule says what it is. Its ??? tag, its veil and what you put on it stay.
  return (pk ? tags.filter((t) => /^<span class="tag (packed|you|daemon)\b/.test(t) || t.includes(`title="${VEIL_NOTE}"`)) : tags).join('');
}

// Your own effects: shields up, helpers running.
// Standing effects on you (no timer): { name, kind, tip }.
function youStanding(s) {
  const e = s.encounter, out = [];
  const add = (name, kind, tip) => out.push({ name, kind, tip });
  if (e.encrypt > 0) add('Encrypted', 'hot', `−${e.encrypt} every cycle until the Encryptor breaks. Purge, Scrub or Rollback wipes it, and a ◆ stops the next Encrypt.`);
  for (const p of e.virus.parts) { const heat = alive(p) ? heatOf(p, e.cycle) : 0; if (heat) add('Ratcheted', 'hot', `−${heat} every cycle, ${p.ratchet.amount} more every ${p.ratchet.every} cycles, until you break the ${p.name}. Purge or Rollback starts it over.`); }
  if (rootkitReady(s)) add('Rootkit', 'you', 'Your first hit this fight ignores armor.');
  if (slottedDaemons(s).includes('snapshot') && !e.once?.['dmn-snapshot']) add('Snapshot', 'you', daemonText('snapshot', daemonLevel(s, 'snapshot')));
  if (e.chits > 0) add('Armor', 'you', `${'◆'.repeat(e.chits)} The next attack on you does nothing, however big.`);
  if (e.shield > 0) add('Shield', 'you', `${e.shield}. Absorbs damage from attacks.`);
  if (e.badBlock?.left > 0) add('Cracked', 'hot', `${e.badBlock.name}: your next heals lose up to ${e.badBlock.left}. Purge, Scrub, Rollback or Rotate Keys clears it.`);
  if (e.helpers?.length) add('Helpers', 'daemon', `${e.helpers.length} running. They hit after you each cycle.`);
  for (const x of raidMarks(s, s)) add(x.name, x.kind, x.tip); // a crew boss: Thermal Stress, Corruption, encrypted sectors, marks, aggro
  return out;
}

// Timed effects on you, as bars across the cycle columns they cover (Now = this cycle).
export function statusSpans(s) {
  const e = s.encounter, out = [];
  const add = (name, until, kind, title, value = '') => { if (until >= e.cycle) out.push({ name, value, cycles: until - e.cycle + 1, kind, title }); };
  const st = momentumStacks(s);
  if (st) add('Momentum', e.momentum.until, 'you', `Momentum: +${Math.round(momentumBonus(s) * 100)}% damage (${st} of ${momentumCap(s)} stacks). Each break adds a stack and resets the timer.`, `+${Math.round(momentumBonus(s) * 100)}%${st > 1 ? ` ×${st}` : ''}`);
  for (const [k, until] of Object.entries(e.buffs || {})) if (k !== 'null-route') add(k === 'sinkhole' ? 'Drawing fire' : k === 'stolen' ? 'Stolen cast' : ABILITIES[k]?.name || k, until, 'you', k === 'sinkhole' ? 'Every attack comes at you (Firewall or Bulkhead, with a crew).' : k === 'stolen' ? 'A cast you hijacked: your hits deal 35% more.' : ABILITIES[k]?.help || '');
  add('Null-routed', e.buffs?.['null-route'] ?? -1, 'you', "This cycle's attacks miss you, and your next skill is a critical strike.");
  // What a tell that landed left on you (tells.mjs): Corrupted, a hung command, a skill knocked offline.
  if (e.corrupt) add('Corrupted', e.cycle + e.corrupt.left - 1, 'hot', `${e.corrupt.name} got through, and deals ${e.corrupt.amount} damage every cycle. Purge, Scrub or Rollback cleanses it.`, `−${e.corrupt.amount}`);
  if (e.hung >= e.cycle) add('Hung', e.hung, 'hot', 'A tell landed, and your command does not fire that cycle.');
  for (const [id, until] of Object.entries(e.locked || {})) add(`${ABILITIES[id]?.name || id} offline`, until, 'hot', 'A tell landed and knocked this skill offline.');
  if (e.lockArmed) add('Lock armed', e.cycle, 'hot', 'The first command you fire is locked for 3 cycles, key 1 included. Feed it a skill that is cooling anyway.');
  if (e.virus?.buffs?.overclock >= e.cycle) add('Overclocked', e.virus.buffs.overclock, 'hot', 'Every part of the virus takes double damage, and every attack comes a cycle sooner.', '×2');
  add('Scrambled', e.scrambleUntil ?? -1, 'hot', `Each of your attacks has a ${Math.round(CONFIG.scramble.chance * 100)}% chance to hit you instead, at ${Math.round(CONFIG.scramble.self * 100)}% damage.`, `${Math.round(CONFIG.scramble.chance * 100)}% self-hit`);
  return out;
}

// The interrupt (interrupt.mjs, every fight but a crew boss's): two ticks on a part's bar at 50% and 25%. A spent one
// goes hollow; a boss's core part under rule (a) has phase ticks instead.
function ticksMarkup(s, p) {
  if (!s.encounter?.ticked || !p.ticks) return '';
  return p.ticks.map((t) => `<i class="ptick${t.spent ? ' spent' : ''}${t.phase != null ? ' phase' : ''}" style="left:${t.at * 100}%" title="${esc(t.phase != null ? `Phase tick at ${Math.round(t.at * 100)}%: take the ${p.name} across it and the boss starts its next phase.${t.spent ? ' Spent.' : ''}` : `Tick at ${Math.round(t.at * 100)}%: take the ${p.name} across it on a cycle its move is due and that move is cancelled. Each tick works once a fight.${t.spent ? ' Spent.' : ''}`)}"></i>`).join('');
}
// What crossing takes this cycle, in the Now column: cut ▸ 9 (deal 9), cut ▸ ◆1 + 9 when it still wears armor,
// cut ▸ — when no tick is left.
function cutChip(s, p) {
  const c = cutsNow(s).find((x) => x.part === p.id);
  if (!c) return '';
  const spent = c.budget != null && c.budget <= 0;
  const what = c.need == null || spent ? '—' : `${c.armor ? `◆${c.armor} + ` : ''}${c.need}`;
  const tip = c.need == null ? `The ${p.name} has no tick left to cross.` : spent ? 'The interrupt budget for this fight is spent.' : `Deal ${c.need} to the ${p.name} this cycle${c.armor ? `, after breaking its ${c.armor} ◆,` : ''} to take it across its next tick and cancel its move.`;
  return `<div class="intent cut${c.need == null || spent ? ' none' : ''}" title="${esc(tip)}"><b>cut ▸ ${esc(what)}</b></div>`;
}

// ---------- what protects what (fightread.mjs partLinks) ----------
// A Mutex's lock on its partner's own bar, WoW absorb style: a hatched steel segment over the end of the fill, as wide as
// the lock on the bar's scale, with a padlock at the edge hits drain it from and the number on hover. While a hit this
// cycle would only take lock, the blinking preview slice sits on the segment, not the Integrity. A Lockbox's ward: a cap
// line at the most the part can still lose this cycle. Both show before the protector is decoded (??? in the tooltip).
// A part you've researched to 100% (research.mjs): a small amber star by its name, here and in the Codex.
export const masteredMark = (p) => `<span class="pmast" title="${esc(`${p.name} mastered: research ${RESEARCH.max}. Its component drops ${Math.round((RESEARCH.perk.drop - 1) * 100)}% more often, and you deal ${Math.round((RESEARCH.perk.dmg - 1) * 100)}% more damage to it.`)}">${glyph('mastered')}</span>`;
const unknownTip = (what, by) => `${what}: ???\nBreak one ${by.name} to decode what it does.`;
function guardMarks(s, v, p, fc) {
  const max = p.max || 1, at = (n) => `${((Math.max(0, Math.min(max, n)) / max) * 100).toFixed(2)}%`;
  const lk0 = lockOf(s, v, p), wd0 = wardOf(s, v, p), lk = lk0 && !packed(s, v, lk0.by) ? lk0 : null, wd = wd0 && !packed(s, v, wd0.by) ? wd0 : null; // a packed protector draws nothing
  let out = '';
  if (lk) {
    const from = Math.max(0, p.integrity - lk.cur), cur = Math.min(lk.cur, max - from), lose = Math.min(cur, fc.shield?.[p.id] || 0);
    const tip = knowsPart(s, v, lk.by) ? `Lock ${lk.cur}/${lk.max}: the ${lk.by.name}'s shield on the ${p.name}. Every hit on it drains the lock first.` : unknownTip(`Shield ${lk.cur}/${lk.max}`, lk.by);
    out += `<i class="lockseg" data-lock="${lk.cur}" style="left:${at(from)};width:${at(cur)}" title="${esc(tip)}"><b class="lockpad">${glyph('lock')}</b></i>`;
    if (lose > 0) out += `<i class="loss lockloss" style="left:${at(from)};width:${at(lose)}" title="−${lose} lock this cycle"></i>`;
  }
  if (p.bufHp > 0 && alive(p) && v.parts.some((x) => alive(x) && x.id === p.bufBy)) {
    const by = v.parts.find((x) => x.id === p.bufBy), cur = Math.min(p.bufHp, max), from = Math.max(0, p.integrity - cur);
    const tip = knowsPart(s, v, by) ? `Shield ${p.bufHp}/${p.bufMax || p.bufHp}: the ${by.name}'s shield on the ${p.name}. Your commands' hits drain it first; burns and helpers go under it.` : unknownTip(`Shield ${p.bufHp}`, by);
    out += `<i class="lockseg bufseg" data-lock="${p.bufHp}" style="left:${at(from)};width:${at(cur)}" title="${esc(tip)}"><b class="lockpad">${glyph('shield')}</b></i>`;
  }
  if (wd && wd.left < p.integrity) {
    const tip = knowsPart(s, v, wd.by) ? `Ward cap: the ${p.name} can lose ${wd.left} more this cycle, at most ${wd.cap} a cycle while the ${wd.by.name} stands.` : unknownTip('Cap', wd.by);
    out += `<i class="wardcap${wd.left ? '' : ' spent'}" data-left="${wd.left}" style="left:${at(p.integrity - wd.left)}" title="${esc(tip)}"></i>`;
  }
  return out;
}
// The tethers: a bracket in the board's left gutter from the part a rule sits on to each part it reaches, drawn a piece
// a row (so it follows the rows at any height: dense, a phone), with a node at the middle of its span carrying the
// rule's icon (? until the codex knows the part) and its countdown (↻ N). It glows while the rule holds, goes grey
// while it's down (a broken lock, an overheated Keyring), its countdown taking the node's place, and snaps as the part it hangs from dissolves. Two lanes at most.
function tethers(rows, links, dying) {
  const idx = new Map(rows.map((p, i) => [p.id, i])), per = rows.map(() => '');
  const spans = links.map((l) => {
    const at = [l.from, ...l.to].map((id) => idx.get(id)).filter((i) => i != null);
    return idx.has(l.from) ? { l, a: Math.min(...at), b: Math.max(...at), src: idx.get(l.from), ends: new Set(at) } : null;
  }).filter(Boolean).sort((x, y) => x.a - y.a || y.b - y.a - (x.b - x.a));
  const lanes = [];
  for (const sp of spans) {
    let k = lanes.findIndex((end) => end < sp.a);
    if (k < 0) k = Math.min(lanes.length, 1);
    lanes[k] = Math.max(lanes[k] ?? -1, sp.b); sp.lane = k;
  }
  for (const sp of spans) {
    const { l } = sp, mid = (sp.a + sp.b) / 2, nodeRow = Math.floor(mid), edge = mid !== nodeRow; // an even span: on the line between two rows
    const p = rows[sp.src], snap = l.snap ? ` style="--snap:-${dying(p)}ms"` : '';
    const cls = `tether k-${l.kind} lane${sp.lane} ${l.up ? 'up' : 'down'}${l.known ? '' : ' unk'}${l.snap ? ' snap' : ''}${sp.a === sp.b ? ' stub' : ''}`;
    for (let r = sp.a; r <= sp.b; r++) {
      const top = r === sp.a ? '50%' : '-1px', bottom = r === sp.b ? '50%' : '0';
      const arm = sp.ends.has(r) ? `<i class="tt-arm ${r === sp.src ? 'src' : 'dst'}"></i>` : '';
      // Down with a countdown, the countdown is the node: the one lit thing on the grey line is how long you have.
      const clock = !l.up && l.count != null, count = l.count != null ? `<span class="tt-count">↻${l.count}</span>` : '';
      const node = r === nodeRow ? `<b class="tt-node${edge ? ' edge' : ''}${clock ? ' clock' : ''}">${clock ? '' : l.known ? glyph(l.icon, 'tt-ico') : '?'}${count}</b>` : '';
      per[r] += `<span class="${cls}" data-links="${esc([l.from, ...l.to].join(' '))}" data-kind="${l.kind}"${snap} title="${esc(l.tip)}"><i class="tt-line" style="top:${top};bottom:${bottom}"></i>${arm}${node}</span>`;
    }
  }
  return per;
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
  // A rule of yours that holds on odd (or even) cycles marks the columns it is live in (fightread.mjs cycleGear).
  const gearCyc = (c) => { const names = fighting ? cycleGear(s, e.cycle + c) : []; return names.length ? `<i class="gcyc" title="${esc(`${list2(names)}: live on cycle ${e.cycle + c}.`)}">${glyph('clock')}</i>` : ''; };
  const live = fighting ? gearLive(s) : [], onParts = gearOnParts(live);
  const head = `<div class="brow bhead"><div class="bcell bname">Part</div>
    <div class="bcell bnow${gearCyc(0) ? ' gear-cyc' : ''}"><span>Now <small class="cyc">cycle ${e.cycle}</small>${gearCyc(0)}</span><span class="countdown" id="countdown">${!fighting ? '—' : e.paused ? 'II' : remaining.toFixed(1)}</span><div class="cyclebar">${e.sync && fighting ? `<i class="sync-win${e.sync.surprise ? ' surprise' : ''}" id="sync-win" style="left:${(e.sync.at * 100).toFixed(1)}%;width:${(e.sync.width * 100).toFixed(1)}%" title="${esc(e.sync.surprise ? `Surprise: fire while the bar is here. Inject ticks at once, Tag lasts ${CONFIG.surprise.tagCycles} cycles with burns +${Math.round((CONFIG.surprise.tagged - 1) * 100)}%, Keepalive stretches burns ${CONFIG.surprise.keepalive} cycles.` : `Sync Window: fire your command while the bar is here for +${Math.round(CONFIG.sync.bonus * 100)}% damage. ${SYNC[classOf(s)]?.rule || ''}`)}"></i>` : ''}<span id="cyclebar" style="width:${(e.elapsedMs / cycleLength(s)) * 100}%"></span></div></div>
    ${[1, 2, 3].map((c) => `<div class="bcell${gearCyc(c) ? ' gear-cyc' : ''}">+${c}${gearCyc(c)}${quietCol(c) && !runMode ? '<small class="quiet">quiet</small>' : ''}</div>`).join('')}</div>`;
  // Your row mirrors the parts: what you'll do in each upcoming cycle.
  const cutNote = (q) => { const x = q?.target && e.ticked ? crossBy(s, q.ability, part(s, q.target)) : null; return x === 'cut' ? ' <small class="cuts">cuts</small>' : x === 'both' ? ' <small class="cuts">cuts · −tick</small>' : x === 'waste' ? ' <small class="cuts waste">−tick</small>' : ''; };
  const prog = !e.queue && fighting ? progNow(s) : null; // your program's next move (routines.mjs), when one runs your fights
  const nowChip = e.queue
    ? `<div class="intent mine" data-k="you@${e.cycle}" data-at="${esc(e.queue.target || '')}" title="Press Enter on an empty line to go now">${esc(e.queue.text)}${cutNote(e.queue)}${fighting && e.queue.target ? armorBadge(s, e.queue.ability, part(s, e.queue.target)) : ''}</div>`
    : prog || (e.lastAttack
        ? `<div class="intent mine auto" data-k="you@${e.cycle}" data-at="${esc(e.lastAttack.split(' ')[1] || '')}" title="Nothing typed: you ${esc(spikeName(s))} the last part you hit">${esc(said(s, e.lastAttack))} <small>auto</small></div>`
        : '<div class="intent mine idle">—</div>');
  const planCell = (i) => (e.plan[i] ? `<div class="intent mine plan" data-k="you@${e.cycle + 1 + i}" data-at="${esc(e.plan[i].target || '')}">${esc(e.plan[i].text)}</div>` : '');
  // Your slotted daemons: each chip sits on the cycle it acts next.
  const dmn = fighting ? slottedDaemons(s).filter((id) => DAEMONS[id].cd && (!DAEMONS[id].exfil || e.escapeAt)) : [];
  const daemonCell = (c) => dmn.filter((id) => daemonNext(s, id) === e.cycle + c).map((id) => `<div class="intent daemon" data-k="daemon:${id}@${e.cycle + c}" title="${esc(DAEMONS[id].name)} lv ${daemonLevel(s, id)}: ${esc(daemonText(id, daemonLevel(s, id)))}">${esc(DAEMONS[id].name.toLowerCase())}</div>`).join('');
  const cronCell = (c) => daemonCell(c);
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
    else if (!e.queue && progTarget(s)) add(progTarget(s), s.profile?.handle || 'you', 'you prog', progText(s));
    else add(aimOf(e), s.profile?.handle || 'you', 'you', said(s, e.queue?.text || e.lastAttack));
    for (const m of crew.filter(mateUp)) add(aimOf(m.encounter), m.who, 'crew', said(s, m.encounter.queue?.text));
  }
  const pips = (id) => (aims[id] ? `<span class="aim-pips">${aims[id].map((a) => `<span class="aim ${a.kind}" data-who="${esc(a.kind.startsWith('you') ? 'you' : a.who)}" title="${esc(a.who)}${a.text ? ': ' + esc(a.text) : ''}">${esc(initials(a.who))}</span>`).join('')}</span>` : '');

  // A part just broken stays a moment, dissolving (app.js sets _dyingUntil), before it joins the broken list.
  const dying = (p) => !alive(p) && p._dyingUntil > Date.now();
  const fusing = (p) => !alive(p) && p.fuseAt && !p.fused && fighting; // a broken Zip Bomb stays on the board while its fuse burns
  const living = e.virus.parts.filter((p) => alive(p) || dying(p) || fusing(p)), broken = e.virus.parts.filter((p) => !alive(p) && !dying(p) && !fusing(p));
  const patchList = fighting ? patches(s, 4) : [];
  // What protects what, between the rows (a dissolving part's tether snaps with it).
  const since = (p) => Math.max(0, Math.round(1000 - ((p._dyingUntil || 0) - Date.now())));
  const ties = tethers(living, partLinks(s, e.virus, { stands: (p) => alive(p) || dying(p) }), since);
  const rows = living.map((p, ri) => {
    const mine = list.filter((i) => i.source === p.id);
    const nowHit = mine.some((i) => i.col === 0 && i.effect !== 'buffer'); // a Buffer's shield isn't an attack
    const pct = (p.integrity / p.max) * 100;
    const patch = patchList.find((x) => x.source === p.id);
    const cells = [0, 1, 2, 3].map((c) => {
      // Encryption is one ongoing drain: the full chip in Now, then a thin striped line through the
      // later cycles (it keeps going; hover it and it opens up to say so), so the one-off events in those cells stay readable.
      const crypting = e.encrypt > 0 && p.attack?.effect === 'encrypt';
      const cryptChip = !crypting ? '' : c === 0 ? `<div class="intent crypt" title="Encrypted: you lose ${e.encrypt} this cycle. Break ${esc(p.name)} to stop it.">−${e.encrypt} <small>encrypted</small></div>` : `<div class="crypt-line" data-label="−${e.encrypt} encrypted"></div>`;
      // A Ratchet (parts.mjs): the part's own stack, a step more every few cycles it lives; each column shows that cycle's.
      const heat = alive(p) ? heatOf(p, e.cycle + c) : 0;
      const escChip = !heat ? '' : c === 0 ? `<div class="intent crypt esc" title="${esc(`${p.ratchet.name}: you lose ${heat} this cycle, ${p.ratchet.amount} more every ${p.ratchet.every} cycles ${p.name} lives. Break it to end it.`)}">−${heat} <small>ratchet</small></div>` : `<div class="crypt-line esc" data-label="−${heat} ratchet"></div>`;
      const patchChip = patch?.col === c ? `<div class="intent patch" data-k="patch:${esc(p.id)}@${e.cycle + c}" title="${esc(p.name)} patches one ◆ back at the end of ${c === 0 ? 'this cycle' : `cycle ${e.cycle + c}`}, unless you break it first">◆ patch</div>` : '';
      // A tell shows whatever the part hides (tells.mjs): nothing big lands unannounced.
      const told = mine.filter((i) => i.tell && i.col === c).map((i) => tellChip(s, i, c, `tell:${p.id}:${i.id}@${e.cycle + c}`, crew.length && i.effect === 'damage' ? sink || 'all' : null)).join('')
        + mine.filter((i) => i.tell && i.winFrom != null && c >= i.winFrom && c < i.col).map((i) => tellSpan(s, i, c)).join(''); // a window longer than a cycle (tells.mjs)
      if (timersHidden(s, p) && p.attack) return `<div class="bcell">${cryptChip}${escChip}${told || '<div class="intent hidden">?</div>'}${c === 0 ? cutChip(s, p) + progOnPart(s, p) : ''}${patchChip}</div>`;
      const hit = mine.find((i) => i.col === c && !i.tell);
      // With a crew, a damage attack lands on everyone, or on whoever is drawing fire; a crew boss's part with a
      // target rule (raid.mjs) on the one player it's aiming at.
      const aimed = crew.length && hit?.effect === 'damage' && !sink && p.attack.target ? attackTarget(s, p) : null;
      const to = crew.length && hit?.effect === 'damage' ? sink || (aimed ? aimed.who || 'you' : 'all') : null;
      return `<div class="bcell">${cryptChip}${escChip}${told}${hit && !(p.attack ? false : hit.hidden) ? attackChip(hit, c, `${p.id}@${e.cycle + c}`, to) : ''}${c === 0 ? cutChip(s, p) + progOnPart(s, p) : ''}${patchChip}</div>`;
    }).join('');
    // A part with no attack of its own (a Mutex, a Mimic) still shows its row's cells when a tell or a beat sits there.
    const showCells = p.attack || p.ratchet || mine.some((i) => i.tell || !i.hidden || i.effect === 'fuse');
    const spike = p.armor > 0 ? 'spike breaks a ◆' : `spike deals ${previewDamage(s, 'spike', p)}`;
    const marks = partMarks(s, p);
    // A redraw mid-dissolve picks the fade up where it was (a negative delay), not from the start.
    const fade = dying(p) ? ` style="animation-delay:-${Math.max(0, 1000 - (p._dyingUntil - Date.now()))}ms"` : '';
    // Its name cell carries what it does (fightread.mjs partTip: ??? until decoded); the rest of the row, the target.
    // A decoded part whose rule reaches another row shows it under its name (a Mutex: "locks Encryptor").
    const known = knowsPart(s, e.virus, p), cue = known ? partCue(s, e.virus, p) : null;
    const cueTag = cue ? `<span class="pcue"${cue.link ? ` data-link="${esc(cue.link)}"` : ''}>${glyph(cue.icon, 'pcue-ico')}${esc(cue.text)}</span>` : '';
    const guard = alive(p) ? guardMarks(s, e.virus, p, fc) : '';
    const gearMark = onParts[p.id] ? `<span class="gpart" title="${esc(`${list2(onParts[p.id])}: live on the ${p.name} now.`)}">${glyph('protocol')}</span>` : '';
    return `<button type="button"${fade} class="brow bpart ${dying(p) ? 'dying' : ''} ${selected === p.id ? 'selected' : ''} ${nowHit ? 'now' : ''} ${p.maxArmor && !p.armor ? 'cracked' : ''}${frozenNow(s, p) && !packed(s, e.virus, p) ? ' frozen' : ''}${asleep(p) && alive(p) && !packed(s, e.virus, p) ? ' standby' : ''} ${marks.map((k) => 'm-' + k).join(' ')}${fighting && progExc(s, p) ? ' m-exc' : ''}" data-target="${esc(p.id)}" ${fighting ? '' : 'disabled'} title="Target ${esc(p.name)}: ${spike}">
      <div class="bcell bname" title="${esc(partTip(s, e.virus, p))}">${ties[ri]}${pips(p.id)}<span class="part-top"><span class="part-name">${esc(p.name)}${known ? '' : '<sup class="unk">?</sup>'}${mastered(s, e.virus, p) && !packed(s, e.virus, p) ? masteredMark(p) : ''}</span>${gearMark}${marksMarkup(marks)}${chitsMarkup(p, fc.chits[p.id] || 0)}<span class="part-hp">${p.integrity}/${p.max}</span></span><span class="part-bar${guard ? ' guarded' : ''}"><span style="width:${pct}%"></span>${lossMark(p.integrity, p.max, fc.parts[p.id] || 0)}${guard}${capLine(s, p)}${ticksMarkup(s, p)}</span><span class="part-tags">${fighting ? progTag(s, p) : ''}${cueTag}${partTags(s, p)}</span></div>
      ${showCells ? cells : '<div class="bcell span4"></div>'}</button>`;
  }).join('');
  // A fight whose parts protect each other keeps the tethers' gutter after the last one goes, so the rows don't jump.
  const keep = !ties.some(Boolean) && e.virus.parts.some((p) => p.lock || p.ward || p.wardsToo || p.twin || p.rearm || p.command || p.buffer || p.front || p.idle) ? '<i class="tether keep" hidden></i>' : '';
  const gone = broken.length ? `<div class="brow bbroken"><div class="bcell span5">Broken: ${broken.map((p) => esc(p.name)).join(', ')}</div></div>` : '';
  // Whose half is playing, across the top of the board (the board itself takes its colour: style.css).
  const ph = fighting ? phaseOf(s) : null, who = esc(e.virus.name.split('-')[0]);
  const strip = ph ? `<div class="phase-strip ph-${ph}" title="Each cycle, you move first, then the virus"><span class="ps-you">${ph === 'wait' ? 'Your move' : 'You'}</span><i>▸</i><span class="ps-them">${who}</span>${e.escapeAt ? `<b class="ps-esc" title="${esc(uploadTip(e))}">${uploadText(e)}</b>` : ''}</div>` : '';
  return strip + head + you() + raidRow(s) + escapeRow(s) + rows + gone + keep;
}
// A Limiter's cap line (the parts plan's P2): where one hit at most takes its bar down to.
const capLine = (s, p) => (p.limit && alive(p) && !packed(s, s.encounter.virus, p) ? `<i class="capline" style="left:${Math.max(0, ((p.integrity - limitOf(p)) / p.max) * 100)}%" title="${esc(`Cap: one hit takes it down to ${Math.max(0, p.integrity - limitOf(p))} at most.`)}"></i>` : '');
// A runner (the Exfil): its own row, "Upload 2/6", the fuse on the cycle its upload completes.
const uploadText = (e) => `Upload ${Math.max(0, Math.min(e.escapeAt, e.cycle - 1))}/${e.escapeAt}`;
const uploadTip = (e) => `Still up at the end of cycle ${e.escapeAt}, its upload completes and the archive is gone. Break its Uplink first.`;
function escapeRow(s) {
  const e = s.encounter;
  if (!e?.escapeAt || !active(s)) return '';
  const col = e.escapeAt - e.cycle;
  const cells = [0, 1, 2, 3].map((c) => `<div class="bcell">${c === col ? `<div class="intent raid fuse escape${c === 0 ? ' now' : ''}" title="${esc(uploadTip(e))}"><b>Upload done</b><small>${c === 0 ? 'this cycle' : `cycle ${e.escapeAt}`}</small></div>` : ''}</div>`).join('');
  return `<div class="brow braid bescape"><div class="bcell bname"><b>${esc(e.virus.name)}</b><small class="esc-left">${uploadText(e)}</small></div>${cells}</div>`;
}

// A crew boss (raid.mjs): its mechanics on their own row, each chip on the cycle it lands, with who it's
// going at. A cast shows as Compiling, and says whether SIGINT stops it. Hover a chip for the whole of it.
const RAID_WHAT = { buster: 'a big hit on whoever holds aggro', pulse: 'a hit on everyone', burst: 'a big hit on the marked player', dot: 'damage every cycle until it is cleansed', absorb: 'a lock that eats the next heals', adds: 'a pair of adds that hit the marked player every cycle unless someone draws fire', priority: 'an add that shields the boss and goes off unless it is broken', shield: 'a shield over the boss to break in time' };
function raidRow(s) {
  if (!raidOf(s) || !active(s)) return '';
  const list = raidIntents(s, 4);
  const chip = (i) => {
    const aim = i.aim ? `→ ${i.aim}` : i.kind === 'priority' ? 'comes online' : i.kind === 'shield' ? 'goes up' : '';
    if (i.left) return `<div class="intent raid fuse" title="${esc(i.kind === 'shield' ? `${i.name} has ${i.amount} shield left. Break it before it runs out, or it goes off on everyone.` : `Break ${i.name} before it goes off on everyone.`)}"><b>${esc(i.name)}</b><small>${i.kind === 'shield' ? `${i.amount} left` : 'goes off'}</small></div>`;
    const tip = `${i.name} is ${RAID_WHAT[i.kind] || i.kind}${i.amount ? `, ${i.amount} on ${i.aim === 'everyone' ? 'each of you' : i.aim || 'its target'}` : i.aim ? `, going for ${i.aim}` : ''}. It lands ${i.col ? `in ${i.col}` : 'this cycle'}.${i.cast ? (i.interrupt ? ' SIGINT stops it.' : ' It can\'t be interrupted.') : ''}`;
    return `<div class="intent raid ${i.cast ? 'cast' : ''} ${i.col === 0 ? 'now' : ''}" data-k="raid:${esc(i.id)}@${s.encounter.cycle + i.col}" title="${esc(tip)}">${i.cast ? '<small class="compiling">Compiling…</small>' : ''}<b>${esc(i.name)}</b><small>${esc(aim)}${i.cast && !i.interrupt ? ' · no SIGINT' : ''}</small></div>`;
  };
  const cells = [0, 1, 2, 3].map((c) => `<div class="bcell">${list.filter((i) => i.col === c).map(chip).join('')}</div>`).join('');
  return `<div class="brow braid"><div class="bcell bname"><b>${esc(s.encounter.virus.name)}</b><small class="quiet">${list.length ? 'what it does next' : 'nothing announced'}</small></div>${cells}</div>`;
}

const LOG_CLASS = { escaped: 'warn', cut: 'you', 'tick-wasted': 'dim', telegraph: 'warn', reroute: 'bad', miss: 'warn', evaded: 'good', regen: 'dim', 'pack-hit': 'bad', heal: 'good',  resolved: 'you', 'server-hit': 'bad', encrypt: 'bad', encrypted: 'bad', decrypted: 'good', blind: 'bad', spawn: 'bad', crashed: 'bad', broken: 'good', loot: 'good', victory: 'good', scan: 'good', trace: 'good', armor: 'you', patch: 'warn', warning: 'warn', 'daemon-set': 'daemon', fled: 'warn', interrupt: 'you', status: 'you', vault: 'note', hold: '', 'trace-lost': 'warn', 'warning-soft': 'warn', blocked: 'note', intrusion: 'note', engage: 'note', damage: 'you', research: 'note', mastered: 'good', exception: 'exc', program: 'you', rail: 'warn' };

// Whose half of the cycle is playing: 'you' (you and your crew), 'them' (the virus), or 'wait' (your move).
export function phaseOf(s) {
  const e = s.encounter, st = e?.steps, now = Date.now();
  // Each half stays lit a moment (app.js holds it), and yours always shows before theirs.
  if (e?._youUntil > now) return 'you';
  if (st?.after || e?._themUntil > now) return 'them';
  return st ? 'you' : 'wait';
}
// Which side a log line belongs to: yours teal, the virus's red.
const THEIRS = new Set(['server-hit', 'encrypt', 'encrypted', 'blind', 'spawn', 'patch', 'evaded', 'blocked', 'intrusion', 'telegraph']);
const MINE_LOG = new Set(['damage', 'broken', 'miss', 'resolved', 'status', 'armor', 'interrupt', 'hold']);
export function logMarkup(s, limit = 60) {
  const start = s.logs.findLastIndex((e) => e.type === 'intrusion');
  const lines = s.logs.slice(Math.max(0, start)).filter((e) => e.type !== 'queued').slice(-limit);
  return lines.map((e) => `<li class="${e.who ? 'crew ' : ''}${THEIRS.has(e.type) && !e.who ? 'side-them' : MINE_LOG.has(e.type) || e.who ? 'side-you' : ''}"><span class="c">c${e.cycle}</span><span class="${e.auto === 'daemon' ? 'daemon' : LOG_CLASS[e.type] ?? ''}">${e.who ? `<b class="who">${esc(e.who)}</b> ` : ''}${esc(e.message)}</span></li>`).join('');
}

// The part a key would hit now: the part you queued it on, else the part you selected, else the one it hits with none
// named (combat.mjs parse: the last part you hit, else the soonest attacker).
function keyAim(s, id, selected) {
  const e = s.encounter, a = ABILITIES[id];
  if (!a || !['part', 'attack'].includes(a.target)) return null;
  if (e.queue?.ability === id && e.queue.target) return part(s, e.queue.target);
  const sel = selected ? part(s, selected) : null;
  if (alive(sel) && (a.target === 'part' || sel.attack)) return sel;
  const q = parse(s, id);
  return q?.target ? part(s, q.target) : null;
}
// Armor takes it: a small ◆ on a key (or your Now chip) whose hit a ◆ on that part would take whole, breaking it and
// dealing no damage (combat.mjs armorTakes: never on Crack and the skills that break or ignore ◆). Steel, the colour of
// what protects a part. The tooltip says what happens and what to do.
export function armorBadge(s, id, p) {
  const n = alive(p) ? armorTakes(s, id, p) : 0;
  if (!n) return '';
  const crack = barKeys(s).some(([, x]) => x === 'crack');
  const tip = `Armor takes this hit: it breaks ${n} ◆ and deals no damage. ${crack ? 'Crack it first.' : 'Break its ◆ first.'}`;
  return `<span class="armd" title="${esc(tip)}" aria-label="${esc(tip)}">◆</span>`;
}

// selected: the part you picked on the board (app.js), the one a key prefills.
export function trayMarkup(s, selected = null) {
  const e = s.encounter;
  const fighting = active(s);
  // Key 1 Spike, 2–9 and 0 your equipped skills, - SIGINT.
  const cards = barKeys(s).map(([key, id]) => {
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
    // Its moment is on the board (situations.mjs): the key says so, in a word or two.
    const moment = fighting && !wait && !dark ? situationOf(s, id) : null;
    const offline = fighting && e.locked?.[id] >= e.cycle;
    const wiped = fighting && e.wiped?.[id] >= e.cycle; // a Wiper's Wipe (families.mjs)
    const state = !fighting ? short : queued ? 'queued' : wiped ? `WIPED ${e.wiped[id] - e.cycle + 1}` : offline ? 'OFFLINE' : dark ? 'waiting for its moment' : lit ? 'LIT' : moment ? moment.toUpperCase() : wait ? (wait === 1 ? 'ready next cycle' : `ready in ${wait} cycles`) : short;
    // The charge bar along the bottom: full when it's ready, filling back up while it recharges.
    const cd = cooldownOf(s, id), charge = dark ? 0 : !fighting || !wait ? 100 : cd ? Math.round((1 - wait / Math.max(cd, wait)) * 100) : 0;
    const count = fighting && wait ? `<span class="cd" aria-label="${wait} ${wait === 1 ? 'cycle' : 'cycles'} to go">${wait}</span>` : '';
    const help = id === 'spike' ? said(s, a.help).replace(/Spike/g, spikeName(s)) : a.help; // key 1 under your class's name
    const armd = fighting && !dark && !offline && !wiped ? armorBadge(s, id, keyAim(s, id, selected)) : ''; // a key you can't press now says nothing of armor
    return `<button type="button" class="ability ${cantrip ? 'cantrip' : ''} ${wait || dark ? 'cooling' : fighting ? 'ready' : ''} ${lit ? 'lit' : ''} ${moment ? 'moment' : ''} ${offline ? 'offline' : ''}${wiped ? ' wiped' : ''} ${queued ? 'queued' : ''}" data-ability="${id}" title="${esc(scaledText(s, id, help))}"><span class="ico" ${icon(a.icon)}></span><span class="name"><kbd>${key}</kbd>${esc(id === 'spike' ? spikeName(s) : a.name)}</span><span class="state">${state}</span>${count}${armd}<span class="charge" style="width:${charge}%"></span></button>`;
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
const itemTitle = (it) => [`${RARITIES[it.rarity]?.name || ''} ${SLOTS[groupOf(it)]?.name || ''}${it.base && BASES[it.base] && !it.unique && it.rarity !== 'custom' ? '' : it.base && BASES[it.base] ? ` (${BASES[it.base].name})` : ''}`.trim(), it.unique && isNative(it.unique) && it.home?.name ? `Native to ${it.home.name}` : '', it.unique ? UNIQUES[it.unique]?.flavour : BASES[it.base]?.flavour].filter(Boolean).join('. ');
const itemName = (it) => `<b class="iname ${rarityClass(it)}" title="${esc(itemTitle(it))}">${glyph(leadStat(it), 'badge')}${esc(itemLabel(it))}</b>`;
// A unique's effect (or a found Zero-day's), under its stats.
const itemEffect = (it) => (it.zeroDay ? `<small class="zd">${esc(ZERO_DAYS[it.zeroDay].effect)}</small>` : (it.unique || it.rule) && effectLine(it) ? `<small class="zd${it.rule ? ' rule' : ''}">${esc(effectLine(it))}</small>` : '');
// A faction implicit (gear.mjs IMPLICITS): the faction's mark and its line, in its colour; the faction's name on hover.
const implicitRow = (it, tag = 'small') => (it?.implicit && FX[it.implicit] ? `<${tag} class="impl" style="--fc:${FX[it.implicit].color}" title="${esc(FX[it.implicit].name)}">${glyph('f-' + it.implicit)}<span><b>${esc(IMPLICITS[it.implicit].name)}</b> — ${esc(implicitText(it))}</span></${tag}>` : '');
const statsHtml = (it) => `<small>${Object.entries(it.stats).filter(([k]) => STATS[k]).map(([k, v]) => `<span class="${v < 0 ? 'neg' : ''}">${esc(statLine({ [k]: v }))}</span>`).join('')}</small>`;

// A native unique's home network, for its tooltip: a network you know that has it, else the one it came from.
export function nativeHome(s, it) {
  const who = homeOf(s, it.unique), h = who ? { name: nameOf(s, who), who } : it.home || homeName(s, it.unique);
  return `${h.name}${h.who ? ` (${whoLabel(h.who)})` : ''}`;
}
// The hover card for an item (app.js shows it): a protocol's glyph (protocol-glyphs.mjs; a filter's rotating ASCII
// wireframe, which app.js spins), in its rarity colour, over its name, rarity, kind, level, stats one a line and effect.
export function itemTipMarkup(s, ref) {
  const f = ref?.startsWith('f:') ? filtersOf(s)[Number(ref.slice(2))] : null;
  const it = f || stashItem(s, ref);
  if (!it) return '';
  const kind = f ? 'filter' : groupOf(it), r = it.rarity;
  const stats = f ? `<span>${esc(filterLine(f))}</span>` : invStats(it);
  const where = !f && loadedOn(s, it.id) ? `<span class="tag dim">on ${esc(ARCHETYPES[loadedOn(s, it.id)].name)}</span>` : '';
  const flavour = !f && (it.unique ? UNIQUES[it.unique]?.flavour : BASES[it.base]?.flavour);
  const vs = f || loadedOn(s, it.id) === classOf(s) ? '' : swapCompare(s, it);
  const home = !f && it.unique && isNative(it.unique) ? nativeHome(s, it) : null;
  return `<div class="ptip-card r-${r}">${f ? `<pre class="ptip-art" data-shape="${kind}" aria-hidden="true"></pre>` : `<span class="ptip-glyph">${glyphMarkup(it, 'tip')}</span>`}<div class="ptip-body"><b class="iname r-${r}">${esc(f ? f.name : itemLabel(it))}</b><small>${esc(RARITIES[r]?.name || '')} ${esc(f ? 'filter' : SLOTS[kind]?.name || '')} · Lv ${it.level}</small>${where}${home ? `<span class="tag native" title="About ten times as likely on its home network as anywhere else">Native · ${esc(home)}</span>` : ''}<div class="ptip-stats">${stats}</div>${!f ? implicitRow(it) : ''}${!f && (it.zeroDay || it.unique || it.rule) ? itemEffect(it) : ''}${!f && it.unique && setOf(it.unique) ? setLines(s, it.unique) : ''}${flavour ? `<em>${esc(flavour)}</em>` : ''}${vs}</div></div>`;
}
// The name of an item's effect (its Zero-day's, the unique's own, its rule's), or ''.
const fxName = (x) => x && (x.zeroDay ? ZERO_DAYS[x.zeroDay].name : x.unique ? x.name : x.rule ? RULES[x.rule]?.name || '' : '');
// Loading a stash protocol: what changes against what's in that slot now (▲ gains, ▼ losses).
function swapCompare(s, it) {
  const kind = groupOf(it), same = SLOT_KINDS.slice(0, slotCount(s)).indexOf(kind);
  if (same < 0) return '';
  const out = freeSlot(s, kind) < 0 ? stashItem(s, rigOf(s)[same]) : null;
  const keys = [...new Set([...Object.keys(it.stats || {}), ...Object.keys(out?.stats || {})])].filter((k) => STATS[k]);
  const rows = keys.map((k) => [k, (it.stats[k] || 0) - (out?.stats?.[k] || 0)]).filter(([, d]) => Math.abs(d) > 1e-9).sort((a, b) => b[1] - a[1])
    .map(([k, d]) => `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲ +' : '▼ −'}${fmtStat(k, Math.abs(d))} ${esc(STATS[k].name)}</span>`);
  if (fxName(out) && fxName(out) !== fxName(it)) rows.push(`<span class="down">▼ ${esc(fxName(out))}</span>`);
  if (out?.implicit && out.implicit !== it.implicit) rows.push(`<span class="down">▼ ${esc(IMPLICITS[out.implicit]?.name || '')}</span>`); // its faction implicit
  return `<div class="ptip-vs"><small>${out ? `vs ${esc(itemLabel(out))}` : 'into an empty slot'}</small>${rows.length ? rows.join('') : '<span class="dim">no change</span>'}</div>`;
}

// The stash's filter, order and the board's pick (screen state only). sel: 'slot:<i>' (silkPick); sort: 'up' (the
// biggest gain first), 'level' or 'rarity'.
export const stashUi = { filter: 'all', sel: null, sort: 'up' };
// An item's stats, one a line.
const invStats = (it) => Object.entries(it.stats).filter(([k]) => STATS[k]).map(([k, v]) => `<span class="${v < 0 ? 'neg' : ''}"><b>${v < 0 ? '−' + fmtStat(k, -v) : '+' + fmtStat(k, v)}</b> ${esc(STATS[k].name)}</span>`).join('');
// An item's effect as a line: its Zero-day's, the unique's own or its rule's ('' for none).
const fxText = (it) => (it.zeroDay ? ZERO_DAYS[it.zeroDay].effect : it.unique || it.rule ? effectLine(it) : '');

// ---------- sets (sets.mjs) ----------
// What you have of each set: the pieces loaded, held in the stash, ever found (the Collection), and the active rows.
const setHave = (s) => { const on = loaded(s); return { worn: on.map((x) => x.unique).filter(Boolean), held: new Set((s.stash || []).map((x) => x.unique).filter(Boolean)), found: new Set(Object.keys(s.collection || {})), active: activeSets(on), sub: subOf(s) }; };
// A class set's subclass line, under its 4-piece bonus: lit once the bonus is on and the subclass is yours.
const subLines = (b) => (b.subs || []).map((x) => `<span class="sb sub${x.on ? ' on' : ''}" title="${esc(x.on ? 'On' : x.mine ? `Wear ${b.at} pieces` : `${SUBS[x.id]?.name || x.id} only`)}">${esc(SUBS[x.id]?.name || x.id)}: ${esc(x.text)}</span>`).join('');
const SET_PIECE_TIP = { worn: 'Loaded', held: 'In your stash', missing: 'Found once; not in your stash now', unknown: 'Not found yet' };
// A set under a piece, WoW's tooltip grammar: its name and count, its pieces (loaded and held lit, missing dim, ??? until
// found), then each bonus, lit once it's on; a class set's name carries its tier line. compact: one line of pieces, for
// a stash or slot row.
export function setLines(s, uniqueId, compact = false) {
  const set = setOf(uniqueId);
  if (!set) return '';
  const have = setHave(s), c = setCard(set.id, have), g = greenOf(uniqueId, have.worn);
  // The piece's green line (Diablo 2's): a second small stat, grey until this piece and another of its set are loaded.
  const green = g ? `<span class="sg${g.on ? ' on' : ''}" title="${esc(g.on ? 'On' : `Load it with another ${c.name} piece`)}">With ${g.at} pieces: ${esc(g.text)}</span>` : '';
  const pieces = c.pieces.map((p) => `<span class="sp ${p.state}" title="${esc(SET_PIECE_TIP[p.state])}">${esc(p.name || '???')}</span>`).join('');
  const bonuses = c.bonuses.map((b) => `<span class="sb${b.on ? ' on' : ''}${b.blocked ? ' blocked' : ''}" title="${esc(b.blocked ? `Only one 4-piece bonus at a time: ${b.blocked} reached four first and keeps it.` : b.on ? 'On' : `Wear ${b.at} pieces`)}">(${b.at}) Set: ${esc(b.text)}${b.blocked ? ` <em>${esc(b.blocked)} holds it</em>` : ''}</span>${compact ? '' : subLines(b)}`).join('');
  const tier = tierLine(set.id);
  return `<span class="set-lines${compact ? ' compact' : ''}">${green}<b class="set-name">${esc(c.name)} (${c.n}/${c.total})</b>${tier && !compact ? `<small class="set-tier">${esc(tier)}</small>` : ''}<span class="set-pieces">${pieces}</span><span class="set-bonuses">${bonuses}</span></span>`;
}
// The Loadout's set bonuses: each set you wear two or more of, its open bonuses, and the 4-piece rule when it bites.
function setBonusCard(s) {
  const rows = activeSets(loaded(s)).filter((r) => r.open.length || r.blocked);
  if (!rows.length) return '';
  const sub = subOf(s); // a class set's 4-piece: your subclass's line under it
  const line = (r) => `<li><b class="set-name">${esc(r.name)} (${r.n}/${r.total})</b>${r.open.map((n) => `<span class="sb on">(${n}) Set: ${esc(SETS[r.id].bonuses[n].text)}</span>${Object.entries(SETS[r.id].bonuses[n].subs || {}).filter(([k]) => k === sub).map(([k, x]) => `<span class="sb sub on">${esc(SUBS[k]?.name || k)}: ${esc(x.text)}</span>`).join('')}`).join('')}${r.blocked ? `<span class="sb blocked" title="Only one 4-piece bonus at a time: the set that reached four first keeps it.">(4) Set: ${esc(SETS[r.id].bonuses[4].text)} <em>${esc(r.blocked.by)} holds it</em></span>` : ''}</li>`;
  return `<div class="set-bonus-card"><h3>Set bonuses</h3><ul>${rows.map(line).join('')}</ul></div>`;
}

// A character sheet for one side: every stat it can have, grouped, with totals (bases included).
function statSheet(s, side) {
  const total = (k) => {
    const v = gearStat(s, k, side);
    if (k === 'crit') return { v: critChance(s), text: `${critChance(s)}%`, base: true };
    if (k === 'critDamage') return { v, text: v ? `+50% +${v}` : '+50%', base: true }; // a crit's half again (CRIT.multiplier), and Crit Damage on top: no decimals
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
  const stash = s.stash || [], pick = silkPick(s);
  // The stash's order: the biggest gain against its slot first (Best), or the highest level, or the rarest.
  const byRarity = (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.level - a.level;
  const byLevel = (a, b) => b.level - a.level || RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
  const sort = stashUi.sort === 'level' ? byLevel : stashUi.sort === 'rarity' ? byRarity : (a, b) => upScore(s, b) - upScore(s, a) || byRarity(a, b);
  // The stash lists what isn't in your slots (loaded items live on the board above it).
  const spare = stash.filter((it) => loadedOn(s, it.id) !== classOf(s));
  const shown = spare.filter((it) => stashUi.filter === 'all' || groupOf(it) === stashUi.filter);
  const tiles = shown.sort(sort).map((it) => stashTile(s, it, pick, busy)).join('');
  const sorts = `<div class="inv-filters pg-sort" role="group" aria-label="Sort">${[['up', '▲ Best'], ['level', 'Lv'], ['rarity', 'Rarity']].map(([k, l]) => `<button type="button" data-stash-sort="${k}" aria-pressed="${(stashUi.sort || 'up') === k}">${esc(l)}</button>`).join('')}</div>`;
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
  return { tiles, filters, sorts, shown, spare, stash, cls, lvl, busy, pick, counts, c, zc, ccost, zcost, can, picker, mine, recipes, focus };
}

// ---------- the protocol board (Loadout → Protocols) ----------
// The rig's board, silkscreened: the rig in the middle and its slots as labelled footprints, three a side (exploit,
// shell and script left; proxy and the two implants right), each traced to the rig. Protocols are software: a footprint
// is a place on the board with the protocol's glyph and name on it, never a part plugged in. Beside it the stash (a
// slot you pick lists every item of its kind, best first); under the board, the set bonuses and the stat sheet. An
// item's datasheet is a popover on a stash row or a filled slot (hover or focus; a tap on a phone, as a bottom sheet
// with its buttons), app.js.
const SLOT_REFS = ['U1', 'J1', 'SH1', 'U2', 'IC5', 'IC6']; // each slot's designator on the board
const BOARD_AT = [[0, 0], [1, 0], [0, 1], [0, 2], [1, 1], [1, 2]]; // each slot's side (0 left, 1 right) and row
const slotItem = (s, i) => (i < slotCount(s) && rigOf(s)[i] ? stashItem(s, rigOf(s)[i]) : null);
const opensAt = (i) => PROTOCOL_SLOTS.find((x) => x.slots > i)?.level;
// Where loading it goes: a free slot of its kind, else the first of its kind (a swap); -1 with none open yet.
const loadSlot = (s, it) => { const free = freeSlot(s, groupOf(it)); return free >= 0 ? free : SLOT_KINDS.slice(0, slotCount(s)).indexOf(groupOf(it)); };
// What loading it would replace (null for a free slot).
const loadOut = (s, it) => { const at = loadSlot(s, it); return at >= 0 && freeSlot(s, groupOf(it)) < 0 ? slotItem(s, at) : null; };
// Why it can't load now, or ''.
const loadBlock = (s, it, busy) => (busy ? 'At home only' : loadSlot(s, it) < 0 ? `No ${SLOTS[groupOf(it)]?.name || ''} slot yet`
  : (it.zeroDay && zeroDay(s, it.zeroDay)) || (it.unique && loaded(s).some((x) => x.unique === it.unique)) ? 'You already run this one' : '');
// How much loading it gains against what its slot runs now: each stat's change in its budget points (STATS base), so
// Damage and Crit weigh alike. One with no slot open yet sorts last.
function upScore(s, it) {
  if (loadSlot(s, it) < 0) return -1e9;
  const out = loadOut(s, it);
  return [...new Set([...Object.keys(it.stats || {}), ...Object.keys(out?.stats || {})])].filter((k) => STATS[k]).reduce((n, k) => n + ((it.stats[k] || 0) - (out?.stats?.[k] || 0)) / STATS[k].base, 0);
}
// Load (or Swap, when its slot is full). long: the datasheet's, which names the slot.
function loadButton(s, it, busy, long = false) {
  const why = loadBlock(s, it, busy), at = loadSlot(s, it), swap = at >= 0 && freeSlot(s, groupOf(it)) < 0;
  const label = `${swap ? 'Swap' : 'Load'}${long && at >= 0 ? ` into ${SLOT_REFS[at]}` : ''}`;
  return `<button type="button" class="${long ? 'btn primary' : 'inv-btn'} load" data-command="load ${it.id}" ${why ? 'disabled' : ''} title="${esc(why || (swap ? `Swap it in for what ${SLOT_REFS[at]} runs now` : `Load it into ${SLOT_REFS[at]}`))}">${label}</button>`;
}
const scrapButton = (s, it, busy, long = false) => (loadedOn(s, it.id) ? '' : `<button type="button" class="${long ? 'btn' : 'inv-btn'}" data-command="deconstruct ${it.id}"${['custom', 'zeroday', 'indemnified'].includes(it.rarity) ? ' data-confirm="Sure? Deconstruct"' : ''} ${busy ? 'disabled' : ''} title="Deconstruct it for salvage, code and Exploits" aria-label="Deconstruct ${esc(it.name)}">${glyph('scrap')}${long ? ' Deconstruct' : ''}</button>`);

// The picked slot: { slot, chosen } (chosen: a slot you clicked, not the first one by default).
function silkPick(s) {
  const sel = stashUi.sel || 'slot:0';
  if (sel.startsWith('slot:')) { const i = Number(sel.slice(5)); return { slot: i >= 0 && i < SLOT_KINDS.length ? i : 0, chosen: !!stashUi.sel }; }
  const on = rigOf(s).indexOf(sel);
  return { slot: on >= 0 && on < slotCount(s) ? on : 0 };
}

// The board. Traces are drawn in percent of the board's inner box (style.css lays the columns out to match:
// footprints 36%, a 6% run, the rig 16%), and the picked slot's is live.
// A footprint: its glyph and, beside it on the same middle line, the name, a set piece's set and the slot's label.
function silkBoard(s, p) {
  const n = slotCount(s), { pick, busy } = p;
  const traces = [], fps = [];
  SLOT_KINDS.forEach((kind, i) => {
    const [side, row] = BOARD_AT[i], ref = SLOT_REFS[i], name = SLOTS[kind]?.name || kind, it = slotItem(s, i), locked = i >= n;
    const y = ((row + 0.5) * 100) / 3, py = 50 + (row - 1) * 11, [x0, x1, x2, x3] = side ? [64, 62, 59.5, 58] : [36, 38, 40.5, 42];
    traces.push(`<polyline points="${x0},${y.toFixed(2)} ${x1},${y.toFixed(2)} ${x2},${py} ${x3},${py}" class="silk-trace${locked ? ' off' : pick.slot === i ? ' live' : ''}" vector-effect="non-scaling-stroke"/>`);
    const label = `<span class="silk-ref"><i class="silk-led" aria-hidden="true"></i><b>${ref}</b>${esc(name)}</span>`;
    const state = `${pick.slot === i ? ' sel' : ''}${locked ? ' locked' : it ? ` ${rarityClass(it)}` : ' empty'}`;
    let body;
    if (locked) body = `<div class="silk-pick"><span class="silk-hole" aria-hidden="true"></span><span class="silk-text"><span class="silk-none">Lv ${opensAt(i)}</span>${label}</span></div>`;
    else {
      // A click picks the slot (and lists the stash's items of its kind, app.js); a filled one's datasheet pops up on it.
      const attrs = `data-silk-sel="slot:${i}" data-silk-kind="${kind}" aria-pressed="${pick.slot === i}" aria-label="${esc(`${ref} ${name}: ${it ? itemLabel(it) : 'empty'}`)}"`;
      // A set piece carries its set and count in set green (the datasheet has the rest); an empty slot, how many fit.
      const set = it?.unique && setOf(it.unique) ? setCard(setOf(it.unique).id, setHave(s)) : null, fits = p.counts[kind] || 0;
      const text = it ? `<b class="iname ${rarityClass(it)}">${esc(itemLabel(it))}</b>${set ? `<small class="silk-set">${esc(set.name)} (${set.n}/${set.total})</small>` : ''}`
        : `<span class="silk-none">Empty${fits ? ` <b class="silk-count" title="${fits} in the stash">${fits}</b>` : ''}</span>`;
      body = `<button type="button" class="silk-pick" ${attrs}>${it ? glyphMarkup(it, 'md') : '<span class="silk-hole" aria-hidden="true"></span>'}<span class="silk-text">${text}${label}</span></button>${it ? `<button type="button" class="inv-btn silk-out" data-command="unload ${it.id}" ${busy ? 'disabled' : ''} title="Unload" aria-label="Unload ${esc(it.name)}">×</button>` : ''}`;
    }
    fps.push(`<div class="silk-fp at-${side ? 'r' : 'l'}${row}${state}" data-kind="${kind}"${it && !locked ? ` data-pdetail="${esc(it.id)}"` : ''} style="--i:${i}">${body}</div>`);
  });
  return `<div class="silk-board"><svg class="silk-traces" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${traces.join('')}</svg>
    <div class="silk-rig"><i class="silk-pin1" aria-hidden="true"></i><b>${esc(s.profile?.handle || 'you')}</b><small>${esc(p.cls)} · ${p.lvl}</small></div>${fps.join('')}</div>`;
}

// An item in full: its name, rarity, kind and level beside its glyph, then acts (the buttons), its stats one a line
// (against vs.out when it's set: ▲ ▼), its effect, its set, its flavour.
function itemSheet(s, it, vs = null, acts = '') {
  const where = loadedOn(s, it.id), home = it.unique && isNative(it.unique) ? nativeHome(s, it) : null, out = vs?.out;
  const flavour = it.unique ? UNIQUES[it.unique]?.flavour : BASES[it.base]?.flavour;
  const keys = [...new Set([...Object.keys(it.stats || {}), ...Object.keys(out?.stats || {})])].filter((k) => STATS[k]);
  const signed = (k, v) => (v < 0 ? '−' : '+') + fmtStat(k, Math.abs(v));
  const rows = keys.map((k) => {
    const v = it.stats[k] || 0, d = v - (out?.stats?.[k] || 0);
    return `<div class="${v < 0 ? 'neg' : v ? '' : 'zero'}"><dt>${glyph(k)}${esc(STATS[k].name)}</dt><dd>${v ? signed(k, v) : '—'}</dd>${vs ? `<dd class="silk-d ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${Math.abs(d) > 1e-9 ? `${d > 0 ? '▲' : '▼'} ${fmtStat(k, Math.abs(d))}` : ''}</dd>` : ''}</div>`;
  }).join('');
  const lost = fxName(out) && fxName(out) !== fxName(it) ? `<p class="silk-lost">▼ ${esc(fxName(out))}</p>` : '';
  const [fxHead, ...fxRest] = fxText(it).split(' — ');
  const effect = fxHead ? `<h4 class="silk-kicker">Effect</h4><p class="silk-fx">${fxRest.length ? `<b>${esc(fxHead)}</b> — ${esc(fxRest.join(' — '))}` : esc(fxHead)}</p>` : '';
  return `<div class="silk-head"><div class="silk-headtext"><h3 class="silk-title iname ${rarityClass(it)}">${esc(itemLabel(it))}</h3>
    <p class="silk-sub">${esc(RARITIES[it.rarity]?.name || '')} · ${esc(SLOTS[groupOf(it)]?.name || '')} · Lv ${it.level}${where && where !== classOf(s) ? ` <span class="tag dim">on ${esc(ARCHETYPES[where].name)}</span>` : ''}${home ? ` <span class="tag native" title="About ten times as likely on its home network as anywhere else">Native · ${esc(home)}</span>` : ''}</p>${acts}</div><div class="silk-plate">${glyphMarkup(it, 'lg')}</div></div>
    <h4 class="silk-kicker">${vs ? (out ? `Stats · vs ${esc(itemLabel(out))}` : 'Stats · into an empty slot') : 'Stats'}</h4><dl class="silk-stats${vs ? ' vs' : ''}">${rows}</dl>${implicitRow(it, 'p')}${lost}${effect}${it.unique && setOf(it.unique) ? setLines(s, it.unique) : ''}${flavour ? `<em class="silk-flavour">${esc(flavour)}</em>` : ''}`;
}

// An item's datasheet, for its popover (app.js: beside a stash row or a filled slot on hover or focus; a bottom sheet
// on a phone): itemSheet against what its slot runs now (▲ ▼), then its buttons: Load or Swap and Deconstruct from the
// stash, Unload from the board. '' when it's gone.
export function protocolDetailMarkup(s, id) {
  const it = stashItem(s, id);
  if (!it) return '';
  const busy = active(s) || !!s.run, mine = loadedOn(s, it.id) === classOf(s);
  const acts = mine ? `<button type="button" class="btn" data-command="unload ${it.id}" ${busy ? 'disabled title="At home only"' : ''}>Unload</button>` : loadButton(s, it, busy, true) + scrapButton(s, it, busy, true);
  return `<div class="pg-detail ${rarityClass(it)}">${itemSheet(s, it, !mine && loadSlot(s, it) >= 0 ? { out: loadOut(s, it) } : null)}<div class="silk-acts pg-acts">${acts}</div></div>`;
}

// A stash item as a row, to scan down: its glyph, the name in its rarity colour, kind and level (and the class it's on
// elsewhere), and its three biggest stats as numbers with ▲ ▼ against what its slot runs now. A click (Enter) loads it;
// its datasheet pops up beside it. Load (or Swap) and Deconstruct on it. fit: the picked slot takes it.
function stashTile(s, it, pick, busy) {
  const where = loadedOn(s, it.id), fit = pick.chosen && SLOT_KINDS[pick.slot] === groupOf(it);
  const out = loadOut(s, it), at = loadSlot(s, it), vs = at >= 0, why = loadBlock(s, it, busy);
  const top = Object.entries(it.stats).filter(([k]) => STATS[k]).sort(([a, x], [b, y]) => Math.abs(y) / STATS[b].base - Math.abs(x) / STATS[a].base).slice(0, 3);
  const stats = top.map(([k, v]) => {
    const d = v - (out?.stats?.[k] || 0);
    return `<span class="silk-st${v < 0 ? ' neg' : ''}">${glyph(k)}<b>${v < 0 ? '−' : '+'}${fmtStat(k, Math.abs(v))}</b><span class="sr-only"> ${esc(STATS[k].name)}</span>${vs && Math.abs(d) > 1e-9 ? `<i class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}</i>` : ''}</span>`;
  }).join('');
  const go = why ? `aria-disabled="true" title="${esc(why)}"` : `data-command="load ${it.id}" aria-label="${esc(`${out ? 'Swap' : 'Load'} ${itemLabel(it)} into ${SLOT_REFS[at]}`)}"`;
  return `<li class="silk-tile ${rarityClass(it)}${fit ? ' fit' : ''}" data-kind="${groupOf(it)}" data-pdetail="${esc(it.id)}"><button type="button" class="silk-pick" ${go}>${glyphMarkup(it, 'sm')}<span class="silk-text"><b class="iname ${rarityClass(it)}">${esc(itemLabel(it))}${where ? ` <span class="tag dim">on ${esc(ARCHETYPES[where].name)}</span>` : ''}</b><span class="silk-sts">${stats}</span></span><span class="pg-lv"><b>Lv ${it.level}</b><small>${esc(SLOTS[groupOf(it)]?.name || '')}</small></span></button><span class="inv-acts">${loadButton(s, it, busy)}${scrapButton(s, it, busy)}</span></li>`;
}

// Protocols you run, for the class in use (the Loadout's Protocols tab): the board, the stash, then the set bonuses
// and stat sheet. That is the order on a phone; style.css puts the stash beside the board on a wide screen.
export function protocolSlotsCard(s) {
  const p = protocolsParts(s);
  return `<section class="card silk-card"><h2>Protocols · ${esc(p.cls)} Lv ${p.lvl}</h2>${silkBoard(s, p)}</section>`;
}
export const protocolStatsCard = (s) => `<section class="card silk-statcard"><h2>Stats</h2>${setBonusCard(s)}${statSheet(s, 'hacker')}</section>`;
export function protocolStashCard(s) {
  const p = protocolsParts(s);
  return `<section class="card stash-card silk-stash"><h2>Stash · ${p.stash.length}/${STASH_CAP}</h2>${p.spare.length ? `<div class="pg-bar">${p.filters}${p.sorts}</div><ul class="silk-tiles">${p.tiles || '<li class="silk-none">none of these</li>'}</ul>` : `<p class="svc-line">${p.stash.length ? 'all loaded' : 'empty'}</p>`}</section>`;
}
export const protocolGearMarkup = (s) => protocolSlotsCard(s) + protocolStashCard(s) + protocolStatsCard(s);
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
  return `<ul class="mat-grid">${tile('credits', s.server.credits, 'Credits')}${tile('salvage', s.salvage.length, 'Components')}${Object.keys(MATERIALS).map((m) => tile(m, mats[m] || 0, MATERIALS[m].short)).join('')}</ul>`;
}
// A craft section: collapsible, its purpose in one line under the title.
// Which ones you folded stay folded (s.settings.craftShut).
const craftSection = (s, key, title, purpose, body, open = !(s.settings?.craftShut || []).includes(key)) => `<details class="card craft-sec" data-sec="${key}" ${open ? 'open' : ''}><summary><h2 title="${esc(purpose)}">${title}</h2></summary>${body}</details>`;

// The Craft page: categories down the side, the recipes in the one you pick, and the one you pick
// on the right: what comes out, what it takes (have/need), and the button. ui: { cat, pick }.
export function craftCats(s, ui = {}) {
  const p = protocolsParts(s), srv = s.server, busy = p.busy, L = hackerLevel(s);
  // The slot a protocol compiles into: picked on the recipe (ui.slot), Implant from level 15.
  const slots = Object.keys(SLOTS).filter((k) => k !== 'implant' || L >= 15), slot = slots.includes(ui.slot) ? ui.slot : 'exploit';
  const zds = (s.recipes || []).filter((z) => ZERO_DAYS[z]);
  const fc = filterCost(L), fOk = !busy && srv.credits >= fc.credits && Object.entries(fc.code).every(([m, n]) => (materialsOf(s)[m] || 0) >= n) && canAfford(s, SALVAGE_COSTS.filter()) && filtersOf(s).length < FILTER_CAP;
  const cats = [];
  // Protocols: one recipe per stat you know, or any of them.
  cats.push({ id: 'protocols', name: 'Protocols', icon: 'protocol', items: p.mine.length ? [...(p.mine.length > 1 ? [null] : []), ...p.mine].map((k) => ({
    id: k || 'any', name: k ? PROTOCOL_NAMES[k] : 'Any of your recipes', sub: k ? STATS[k].name : `${p.mine.length} recipes`, icon: k ? 'protocol' : 'item', ready: p.can(p.c),
    picker: `<h3 class="craft-sub">Slot</h3><div class="cd-slots" role="group" aria-label="Slot">${slots.map((x) => `<button type="button" class="cd-slot${x === slot ? ' on' : ''}" data-craft-slot="${x}" aria-pressed="${x === slot}" title="${esc(SLOTS[x].about)}">${esc(SLOTS[x].name)}</button>`).join('')}</div>`,
    out: { title: `${k ? PROTOCOL_NAMES[k] : 'A'} ${SLOTS[slot].name}`, rarity: 'tuned', level: L, tags: [['item', SLOTS[slot].name, SLOTS[slot].about]], stats: [k ? [k, '', STATS[k].name + (STATS[k].group === 'survival' ? ' (runs)' : ''), STATS[k].about] : ['item', '?', 'one of yours', 'Built around one of your recipes, at random']] },
    cost: { credits: p.c.credits, salvage: p.ccost }, cmd: `compile${k ? ' ' + k : ''} ${slot}`, pay: `protocol:${p.c.salvage}` })) : [], empty: 'No recipes yet. Blueprints teach them.' });
  if (zds.length) cats.push({ id: 'zeroday', name: 'Zero-days', icon: 'source', items: zds.map((z) => ({ id: z, name: ZERO_DAYS[z].name, sub: 'source', icon: 'source', ready: p.can(p.zc), out: { title: ZERO_DAYS[z].name, rarity: 'zeroday', level: L, lines: [ZERO_DAYS[z].effect] }, cost: { credits: p.zc.credits, salvage: p.zcost }, cmd: `compile ${z}`, pay: `zeroday:${p.zc.salvage}` })) });
  // Filters: always craftable; a stat to build around, or any.
  const knownF = filterRecipes(s);
  // Only the recipes you've found: nothing shows until a blueprint teaches it.
  if (knownF.length) cats.push({ id: 'filters', name: 'Filters', icon: 'firewall', items: [...(knownF.length > 1 ? [null] : []), ...CRAFTABLE.filter((k) => knownF.includes(k))].map((k) => ({
    id: k || 'any', name: k ? FILTER_STATS[k].label.replace(/^of /, '') : 'Any of your recipes', sub: k ? `+${FILTER_STATS[k].range.join('–')}${FILTER_STATS[k].name}` : `${knownF.length} recipes`, icon: 'firewall',
    locked: k ? !knownF.includes(k) : !knownF.length, lock: 'Its blueprint drops from viruses', lockTag: 'blueprint', ready: fOk && (k ? knownF.includes(k) : knownF.length > 0),
    out: { title: k ? `${FILTER_STATS[k].kind === 'prefix' ? FILTER_STATS[k].label + ' ' : ''}${filterBase(L)}${FILTER_STATS[k].kind === 'suffix' ? ' ' + FILTER_STATS[k].label : ''}` : `A ${filterBase(L)}`, rarity: 'tuned', level: L, stats: [['firewall', `+${Math.max(1, Math.round((1 + L / 10) * 1.1))}`, 'firewall lv', 'Levels on your firewall while it sits in a slot'], k ? filterStatRow(k) : ['item', '?', 'one of yours', 'Built around one of your recipes, at random']],
      foot: `<span class="tag dim" title="Filters you hold">${glyph('item')}${filtersOf(s).length}/${FILTER_CAP}</span>${filterSlots(s) ? slotPips('firewall', filtersOn(s).length, filterSlots(s), 'Filter slots') : `<span class="tag hot" title="No filter slots yet. Firewall tiers +1, +3 and +5 each add one.">${glyph('firewall')}0 slots</span>`}` },
    cost: { credits: fc.credits, code: fc.code, salvage: SALVAGE_COSTS.filter() }, cmd: `filter craft ${k || 'any'}`, pay: 'filter' })) });
  if (knowsRelay(s)) cats.push({ id: 'relays', name: 'Relays', icon: 'relay', items: [{ id: 'relay', name: 'Relay', sub: `${kitOf(s).relay || 0} in your kit`, icon: 'relay', ready: !busy && canBuildRelay(s),
    out: { title: 'Relay', tags: [['relay', `${kitOf(s).relay || 0} in your kit`, 'Relays you have, ready to install']], lines: ['Install it on a server you’ve taken over. It pings the unknown servers next to it and flags a contract’s signal.'] }, cost: relayCost(s), cmd: 'relay craft', pay: 'relay' }] });
  return cats;
}
// What comes out: rarity and level as chips, stats as icon rows, then any rule text and a footer.
const filterStatRow = (k) => { const x = FILTER_STATS[k], [a, b] = x.range; return x.family ? [{ ransomware: 'cipher', ghostroot: 'kernel' }[k] || k, `+${a}–${b}`, x.name.replace(/^ lv /, 'lv '), `More levels against ${x.name.replace(/^ lv vs /, '')} invaders only`] : [{ frag: 'scrap', defrag: 'repair', grind: 'damage', chip: 'shield', tarpit: 'tarpit', sting: 'spike' }[k] || 'item', `${Math.max(1, Math.round(a))}–${Math.round(b)}${/^%/.test(x.name) ? '%' : ''}`, x.name.replace(/^% /, '').trim(), '']; }; // whole numbers, and % only on a percentage
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
  if (cost.level > 1) row('server', 'Level (your highest class)', serverLevel(s), cost.level);
  return `<ul class="cd-cost${cls ? ' ' + cls : ''}">${rows.join('')}</ul>`;
}
export function craftMarkup(s, ui = {}) {
  const cats = craftCats(s, ui), busy = active(s) || !!s.run;
  const why = s.run ? 'Craft at home. Jack out first.' : active(s) ? 'Finish the fight first' : '';
  const cat = cats.find((c) => c.id === ui.cat) || cats[0];
  const item = cat.items.find((x) => x.id === ui.pick) || cat.items.find((x) => x.ready) || cat.items.find((x) => !x.locked) || cat.items[0];
  const nav = `<nav class="craft-cats" aria-label="What to craft">${cats.map((c) => { const n = c.items.filter((x) => x.ready).length; return `<button type="button" class="craft-cat${c === cat ? ' on' : ''}" data-craft-cat="${c.id}" aria-pressed="${c === cat}">${glyph(c.icon)}<span>${esc(c.name)}</span>${n ? `<b class="cc-n" title="${n} you can craft now">${n}</b>` : ''}</button>`; }).join('')}</nav>`;
  const list = `<ul class="craft-items">${cat.items.length ? cat.items.map((x) => `<li><button type="button" class="craft-item${x === item ? ' on' : ''}${x.locked ? ' locked' : ''}${x.ready ? ' ready' : ''}" data-craft-pick="${esc(x.id)}">${glyph(x.icon)}<span class="ci-txt"><b>${esc(x.name)}</b><small>${esc(x.sub || '')}</small></span>${x.locked ? `<span class="tag dim plan-lock" title="${esc(x.lock || '')}">${glyph('blueprint')}${x.lockTag || 'plan'}</span>` : x.done ? '<span class="tag you">owned</span>' : x.ready ? '<i class="ci-dot" title="You can craft it"></i>' : ''}</button></li>`).join('') : `<li class="craft-empty">${esc(cat.empty || 'Nothing here yet.')}</li>`}</ul>`;
  const detail = !item ? `<section class="craft-detail card"><p class="quiet">${esc(cat.empty || '')}</p></section>`
    : `<section class="craft-detail card"><h2>${esc(cat.name)}</h2><div class="cd-out${item.out.rarity ? ' r-' + item.out.rarity : ''}">${glyph(item.icon, 'badge')}<h1 class="cd-name${item.out.rarity ? ' r-' + item.out.rarity : ''}">${esc(item.out.title)}</h1>${outBody(item.out)}</div>
      ${item.locked ? `<p class="cd-lock"><span class="tag dim plan-lock">${glyph('blueprint')}${item.lockTag || 'plan'}</span> ${esc(item.lock || '')}</p>` : item.done ? '<p class="cd-lock"><span class="tag you">owned</span></p>' : `${item.picker || ''}<h3 class="craft-sub">Takes</h3>${costRows(s, item.cost)}${item.extra || ''}
      <button type="button" class="btn primary cd-go" data-command="${esc(item.cmd)}"${item.pay ? ` data-pay="${esc(item.pay)}" data-pay-title="${esc(item.out.title)}"` : ''} ${item.ready ? '' : 'disabled'} ${why ? `title="${esc(why)}"` : item.ready ? '' : 'title="Not enough of something above"'}>Craft</button>`}</section>`;
  return `<div class="craft-ui${busy ? ' busy' : ''}">${nav}${list}${detail}</div>`;
}
export const vaultMarkup = protocolsMarkup;
export const gearMarkup = protocolsMarkup;

// ---------- the server (services) ----------
export const fmtTime = (ms) => (ms >= 3600000 ? `${Math.floor(Math.ceil(ms / 60000) / 60)}h ${Math.ceil(ms / 60000) % 60}m` : ms >= 60000 ? `${Math.ceil(ms / 60000)} min` : `${Math.max(0, Math.ceil(ms / 1000))}s`);
// ---------- the wall (invasions) ----------
export function bandsText(s) {
  if (s.degraded) return 'Your wall is down while the server is degraded.';
  const { blocks, holds } = wallBands(s);
  if (!holds) return 'Your wall holds nothing yet. Every invasion breaches.';
  const held = holds > blocks ? ` and holds ${blocks ? `level ${blocks + 1}–${holds}` : `up to level ${holds}`} contested` : '';
  return `Your wall ${blocks ? `blocks invasions up to level ${blocks}` : 'blocks none outright'}${held}; above level ${holds}, they breach.`;
}
export function degradedMarkup(s, now = Date.now()) {
  return s.degraded ? `<div class="degraded" title="Wall down · installs paused"><b>DEGRADED</b><span>${fmtLeft(degradedLeft(s, now))}</span></div>` : '';
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
  if (inv.state === 'watch') return `mapping · ${fmtLeft(inv.mapLeft)}`;
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
  const why = fighting(s, inv) ? 'You are fighting it' : s.run ? 'Jack out of your run first' : active(s) ? 'Finish this fight first' : '';
  if (inv.state === 'travel') {
    const verdict = { blocked: 'will stop it', siege: 'will contest it', breach: "won't hold it: a breach" }[verdictOf(s, inv)];
    if (inv.kind === 'thief') return { text: `${inv.name} reaches ${s.locations.find((l) => l.id === inv.target)?.name || 'your outpost'} in about ${fmtLeft(inv.left)}; its firewall ${verdict}.`, can: !why, why, hp, intercept: true };
    return { text: `${inv.name} reaches your wall in about ${fmtLeft(inv.left)}; your wall ${verdict}.`, can: false, why: 'Still on its way' };
  }
  if (inv.state === 'watch') return { text: `${inv.name} is mapping your wall: ${fmtLeft(inv.mapLeft)} left.`, can: !why, why, hp };
  if (inv.state === 'siege') return { text: `Contested: your wall wears ${inv.name} down (${pct1(grindRate(r))} a minute, ${hp}% left) while it chips ${pct1(chipRate(r))} of your Integrity a minute. Jack in to finish it for a full kill.`, can: !why, why, hp };
  return { text: `Breach: ${inv.name} chips ${pct1(chipRate(r))} of your Integrity a minute until you jack in and fight it.`, can: !why, why, hp };
}
function jackInButton(st) {
  if (st.intercept) return `<button type="button" class="btn ${st.can ? 'primary' : ''}" data-command="intercept" ${st.can ? '' : 'disabled'} title="${esc(st.can ? 'Catch it on its way for a full kill, with nothing stolen' : st.why)}">Intercept</button>`;
  return `<button type="button" class="btn ${st.can ? 'primary' : ''}" data-command="jack in" ${st.can ? '' : 'disabled'} title="${esc(st.can ? 'Fight it at the wall, worn down but with its armor intact, for a full kill' : st.why)}">Jack in</button>`;
}
// An invasion's kind, quirk and a scout's mark, as tags (what it does on hover).
function invTags(s, inv) {
  const kind = inv.kind && inv.kind !== 'raider' ? `<span class="tag ${inv.kind === 'champion' ? 'tag-crew' : 'warn'} inv-kind" title="${esc(tellOf(s, inv))}">${esc(labelOf(inv))}</span>` : '';
  const q = inv.quirk && QUIRKS[inv.quirk] ? `<span class="tag tag-strain" title="${esc(quirkLine(inv))}">${esc(QUIRKS[inv.quirk].name)}</span>` : ''; // what the quirk does to the invasion (its server's rule is about its rooms)
  const m = inv.marked ? `<span class="tag hot" title="A scout mapped your wall for it">mapped +${inv.marked}</span>` : '';
  return [kind, q, m].filter(Boolean).map((t) => ' ' + t).join(''); // a space before each, so they never butt up against the level
}
// What it pays, before the fight: its family's code for your kill (now, then the most it can grow to), the
// odds of a daemon (sure with a capture), and your streak's bonus.
function bountyChips(s, inv) {
  const b = bountyOf(s, inv), n = streakOf(s), name = MATERIALS[b.code]?.name || b.code;
  const chip = (ic, v, tip, cls = '') => `<span class="rw ${cls}" title="${esc(tip)}">${glyph(ic)}<b>${esc(String(v))}</b></span>`;
  const sure = b.capture, odds = Math.round(daemonChance(s, inv.kind === 'thief' && inv.state === 'travel' ? 'intercept' : 'you') * 100);
  return `<div class="rw-chips inv-pay">${chip(b.code, b.now >= b.max ? b.now : `${b.now} → ${b.max}`, `${name} for your kill: ${b.now} now, up to ${b.max} the longer it sits contested. If the wall wears it down, ${b.wall}. An outright block pays ${b.blocked}.`)}${chip('daemon', sure ? 'daemon' : `${odds}%`, sure ? `Your kill leaves a capture: a daemon of band ${daemonBand(inv.level)}, at level ${inv.level}, and a chance at a unique only invasions carry` : `The chance your kill leaves a daemon (band ${daemonBand(inv.level)}, level ${inv.level}). Every stop without one raises it.`, sure ? 'you' : '')}${n ? chip('xp', `+${Math.round((streakMult(s) - 1) * 100)}%`, `A streak of ${n}: each stop pays more`) : ''}</div>`;
}
// harden.sh as the answer to what's coming: shown when +3 levels would turn it into a block.
function hardenAnswer(s, inv) {
  if (inv.kind === 'thief' || hardenLeft(s) || verdictOf(s, inv) === 'blocked' || inv.state === 'watch' || s.degraded) return '';
  const L = effLevel(s, undefined, inv.family) + FIREWALL.harden.plus;
  if ((100 * power(L) * CONFIG.invasion.block) / strength(wallLevelOf(inv), inv.mutation, inv.grade) < CONFIG.invasion.block) return '';
  const n = kitOf(s).harden || 0, hc = hardenCost(s), can = n || canPay(s, hc), busy = active(s);
  return `<button type="button" class="btn small" data-command="firewall harden" ${!can || busy ? 'disabled' : ''} title="+${FIREWALL.harden.plus} levels for ${FIREWALL.harden.ms / 3600000} hours: your wall would stop it">harden.sh ${n ? `× ${n}` : bcost(hc)}</button>`;
}
// Finish a timed build now (credit buyout): the price on the button, off if you can't pay.
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
  const hi = Math.max(holds + 4, you + 4, (inv ? countsAt(inv) : 0) + 2, 8), pct = (lv) => `${Math.min(100, (lv / hi) * 100)}%`;
  const seg = (cls, from, to, icon, tip) => (to > from ? `<span class="wr-seg ${cls}" style="left:${pct(from)};width:calc(${pct(to)} - ${pct(from)})" title="${esc(tip)}">${compact ? '' : glyph(icon)}</span>` : '');
  const mark = (lv, cls, label) => `<span class="wr-mark ${cls}" style="left:${pct(lv - 0.5)}" title="${esc(label)}"><i></i><small>${esc(label)}</small></span>`;
  return `<div class="wall-ruler${compact ? ' compact' : ''}" title="${esc(bandsText(s))}">
    <div class="wr-track">${seg('blocked', 0, blocks, 'firewall', blocks ? `Stopped at the wall: up to level ${blocks}` : '')}${seg('siege', blocks, holds, 'tarpit', `Contested: level ${blocks + 1}–${holds}`)}${seg('breach', holds, hi, 'kill', `Breaks through: level ${holds + 1} and up`)}</div>
    <div class="wr-marks">${you ? mark(you, 'you', `servers ${you}`) : ''}${inv ? mark(countsAt(inv), 'inv ' + inv.state, `${inv.name} ${countsAt(inv)}`) : ''}</div>
    ${compact ? '' : `<div class="wr-scale">${[...new Set([1, blocks, holds, hi])].filter((lv) => lv >= 1 && Math.abs(lv - you) > 1 && (!inv || Math.abs(lv - countsAt(inv)) > 1)).map((lv) => `<span style="left:${pct(lv - 0.5)}">${lv}</span>`).join('')}</div>`}
  </div>`;
}
// The highest level a plain invasion from your network counts as at your wall, its server's grade and all
// (invasion.mjs sendTop): what your firewall is up against.
export const threatTop = (s) => sendTop(s);
// The Safe readout's hover (invasion.mjs wallSafety): what reaches your wall, grade and all, and the invasion out now.
const VERDICT_WORD = { blocked: 'blocks it', siege: 'contests it', breach: 'won\'t hold it' };
export function safetyTip(s, w = wallSafety(s), { bands = true } = {}) {
  if (w.state === 'down') return 'Your wall is down while the server is degraded';
  const sends = w.top ? `Your servers' invasions count up to level ${w.top} at your wall, grade and all.` : 'Nothing attached sends invasions.';
  const inv = s.invasion && s.invasion.kind !== 'thief' ? s.invasion : null, now = inv ? ` ${inv.name} counts ${w.at}: your wall ${VERDICT_WORD[w.verdict]}.` : '';
  return `${bands && w.state !== 'ok' ? `Blocks up to level ${w.blocks} and contests up to ${w.holds}. ` : ''}${sends}${now}`;
}
// A holding's firewall in one compact block (an outpost, a hub you hold): its level, the line on
// what it's vulnerable to against what comes for it (top: the highest level that does), its blocks,
// and Upgrade, Defrag and harden.sh. arg: what the firewall commands take for it.
// A holding's wall in a card row (an outpost, a hub): one status line (level, tier, what it lets through), then
// its actions as equal tiles, each with its name on top and its cost under it.
function fwRow(s, holder, arg, top, now = Date.now()) {
  const f = fwAt(s, holder), b = wallBands(s, ratingAt(s, holder, null, now)), c = upgradeCost(s, holder), busy = active(s) || !!s.run;
  const can = canPay(s, c);
  const state = b.blocks >= top ? 'ok' : b.holds >= top ? 'mid' : 'low', frag = fragLevels(s, holder), def = defragging(s, now, holder), hard = hardenLeft(s, now, holder);
  const line = state === 'ok' ? `<span class="fw-vuln ok" title="Up to level ${top} comes for it">Safe</span>` : `<span class="fw-vuln ${state}" title="Blocks up to level ${b.blocks} and contests up to ${b.holds}. Up to level ${top} comes for it.">Vulnerable to lv ${b.blocks + 1}+</span>`;
  const mods = [frag || def ? `<span class="fw-mod warn" title="Fragmented">−${frag + (def ? FIREWALL.defragLoss : 0)}</span>` : '', hard ? `<span class="fw-mod you" title="harden.sh">+${FIREWALL.harden.plus} · ${fmtTime(hard)}</span>` : ''].join('');
  const cmd = (v) => `firewall ${v}${arg ? ' ' + esc(arg) : ''}`, n = kitOf(s).harden || 0;
  const t = fwTierOf(s, holder) + 1, nv = TIER_PERKS.find((p) => p.tier === t), dc = defragCost(s, holder);
  const tile = (name, cost, command, ok, tip, cls = '') => `<button type="button" class="fw-act${cls ? ' ' + cls : ''}" data-command="${command}" ${ok ? '' : 'disabled'} title="${esc(tip)}"><span class="fa-name">${name}</span>${cost ? `<span class="fa-cost">${cost}</span>` : ''}</button>`;
  const tiles = [
    c && tile(`Upgrade to +${t}`, bcost({ credits: c.credits, cipher: c.cipher, worm: c.worm, kernel: c.kernel }), cmd('upgrade'), !busy && can, `One level more over the base, for good${nv ? `. ${nv.name}` : ''}${f.frag ? '. It leaves every block whole again' : ''}`, can ? 'primary' : ''),
    (f.frag || def) && tile(def ? 'Defragmenting' : 'Defrag', def ? fmtLeft(f.defragUntil - now) : bcost({ credits: dc }), cmd('defrag'), !def && !busy && s.server.credits >= dc, `${FIREWALL.defragLoss} levels down while it runs`),
    n ? tile('harden.sh', `<span class="fa-held">${n} held</span>`, cmd('harden'), !busy, `+${FIREWALL.harden.plus} levels for ${FIREWALL.harden.ms / 3600000} hours`)
      : canPay(s, hardenCost(s, holder)) && tile('harden.sh', bcost(hardenCost(s, holder)), cmd('harden'), !busy, `Write a harden.sh from code: +${FIREWALL.harden.plus} levels for ${FIREWALL.harden.ms / 3600000} hours`),
  ].filter(Boolean).join('');
  return `<div class="fw-row"><div class="fw-stat"><span class="fw-lv">${glyph('firewall')}<b>lv ${effLevel(s, now, null, holder)}</b></span>${fwTier(s, holder)}${mods}${line}</div>${tiles ? `<div class="fw-tiles">${tiles}</div>` : ''}</div>`;
}
// Its tier over the base (the network's, or the holding's own level): the tag, the base and the
// perks it has on hover, the next one ahead.
function fwTier(s, holder = null) {
  const t = fwTierOf(s, holder), got = perksAt(t), next = TIER_PERKS.find((p) => p.tier > t);
  const why = holder ? `Base ${baseOf(s, holder)}: this server's level` : `Base ${baseOf(s)}: your highest attached server's level, less ${BASE_GAP}`;
  const tip = [why, ...got.map((p) => `+${p.tier}: ${p.name}`), next ? `Next perk at +${next.tier}: ${next.name}` : ''].filter(Boolean).join(' · ');
  return `<span class="tag fw-ver" title="${esc(tip)}">+${t}</span>`;
}
// A button's price, after its label: an icon and a number for each thing it takes.
const bcost = (c) => `<span class="bcost">${Object.entries(c).filter(([, n]) => n).map(([k, n]) => `<span title="${esc(k === 'credits' ? 'Credits' : MATERIALS[k]?.name || k)}">${glyph(k)}${n}</span>`).join('')}</span>`;
// A contract's pay as icon chips: credits, Indemnity, XP, standing and rep, anything extra.
function rewardChips(s, c) {
  const r = c.reward, chip = (ic, v, tip, cls = '') => `<span class="rw ${cls}" title="${esc(tip)}">${glyph(ic)}<b>${esc(String(v))}</b></span>`;
  return [r.credits && chip('credits', r.credits, 'Credits'), r.indemnity && chip('indemnity', r.indemnity, 'Indemnity: Halcyon scrip'),
    r.xp && chip('xp', xpFor(s, hackerLevel(s), r.xp), 'XP'),
    r.standing && chip('f-halcyon', `${r.standing > 0 ? '+' : ''}${r.standing}`, 'Halcyon standing', r.standing < 0 ? 'neg' : ''),
    c.offBooks && chip('f-glassjaw', '+5', 'GLASSJAW rep'), r.rep && c.faction && chip('f-' + c.faction, `+${r.rep}`, `${FACTIONS[c.faction].short} rep`),
    r.relay && chip('relay', `×${r.relay}`, 'A relay'), r.blueprint && chip('blueprint', '+1', 'A blueprint'), (r.drop || r.daemon) && chip('item', '+1', 'A protocol, Tuned or better'), r.item && chip('item', '+1', 'A protocol')].filter(Boolean).join('');
}
// How to trace an unknown server, shown rather than explained (docs/style-guide.md section 0): the way that is
// tracing it now on top, with pips for the kills or clears still needed; then every other way as an icon, a label and
// what it adds, dim and locked until you have it. The sentences live in the rows' tooltips.
function traceWays(s, h, via, kit) {
  const relay = !!h.pinged, route = `ping-${h.id}.trc`, banked = !!via?.state?.taken?.['/' + route], left = 100 - h.lead;
  const fam = FAMILIES[h.family]?.name || '?', at = viaName(s, h);
  const row = (ic, label, gain, tip, state = 'on') => `<li class="tw ${state}" title="${esc(tip)}">${glyph(ic)}<span>${esc(label)}</span><b>${esc(gain)}</b></li>`;
  const pips = (n) => (n > 0 ? `<span class="tw-pips" aria-label="${n} more">${'<i></i>'.repeat(Math.min(n, 10))}${n > 10 ? '<small>+</small>' : ''}</span>` : '');
  // The main way: SPRAWL-00's kills (the ? closest to being found goes first), or first clears of the server it hangs off.
  const zone = h.via === CONFIG.zone.id, per = zone ? leadOf(s, Math.min(hackerLevel(s), CONFIG.zone.maxLevel)) : HIDDEN.firstClear;
  const need = per > 0 ? Math.ceil(left / per) : 0;
  const tip = zone
    ? (per > 0 ? `Each kill in ${at} traces the unknown server closest to being found. About ${need} more will finish this one.` : `${at}'s viruses are too far below your level to trace it.`)
    : `The first clear of each room on ${at} traces the servers beside it. About ${need} more will finish this one. Mapping ${at} traces it the rest of the way.`;
  const main = `<div class="tw-main${per > 0 ? '' : ' dim'}" title="${esc(tip)}">${glyph('kill')}<span class="tw-what"><b>${esc(zone ? `Kills in ${at}` : `First clears on ${at}`)}</b>${pips(need)}</span><em>${per > 0 ? `+${per}%` : '—'}</em></div>`;
  const ways = [
    // Lit only while its invasion is on its way: until then there's nothing to beat.
    row('spike', 'Beat its invader', `+${HIDDEN.winLead}%`, `If it sends an invasion, jack in and win to trace it ${HIDDEN.winLead}%. If your wall stops the invasion, it traces it ${HIDDEN.blockLead}%.`, s.invasion?.hidden === h.id ? 'on' : 'off'),
    relay
      ? row(FAM_GLYPH[h.family] || 'kill', `Kill any ${fam}`, `+${HIDDEN.killLead}%`, `Your relay on ${at} hears every ${fam} you kill, at home or on a run.`)
      : row('relay', 'Relay', `+${HIDDEN.killLead}% · +${HIDDEN.routeLead}%`, `A relay on ${at} adds ${HIDDEN.killLead}% for each kill of its family and ${HIDDEN.routeLead}% for its route file.`, 'off'),
    relay && row('relay', route, banked ? 'Banked' : `+${HIDDEN.routeLead}%`, banked ? 'Banked.' : `Pull it from ${at} and bank it.`, banked ? 'done' : 'on'),
    row('injector', kit.injector ? `Trace injector ×${kit.injector}` : 'Trace injector', '+30%', kit.injector ? 'Use it below.' : 'Halcyon, Kestrel and LANTERN sell them.', kit.injector ? 'on' : 'off'),
  ].filter(Boolean).join('');
  return `${main}<ul class="trace-ways">${ways}</ul>`;
}
// The invasion's own card on the map: the virus, where it's from, what it's doing (with a timer
// bar), one line on how your firewall meets it, and Jack in once it's at your wall.
function invaderCard(s) {
  const inv = s.invasion;
  if (!inv) return '';
  const st = invaderStatus(s), o = verdictOf(s, inv), tgt = inv.target && s.locations.find((l) => l.id === inv.target), lv = tgt ? effLevel(s, undefined, inv.family, tgt) : effLevel(s, undefined, inv.family);
  const verdict = { blocked: ['you', 'blocks it'], siege: ['warn', 'contests it'], breach: ['hot', 'won\'t hold it'] }[o];
  const pct = inv.state === 'travel' ? (1 - inv.left / Math.max(1, inv.total)) * 100 : inv.state === 'watch' ? (inv.mapLeft / SCOUT.mapMs) * 100 : inv.hp * 100;
  const tags = `${levelTag(s, inv.level)}${invTags(s, inv)}${inv.mutation ? `<span class="tag tag-mut" title="${esc(MUTATIONS[inv.mutation].rule)}">${esc(MUTATIONS[inv.mutation].name)}</span>` : ''}${inv.strain && STRAINS[inv.strain] ? `<span class="tag tag-strain" title="${esc(STRAINS[inv.strain].rule || '')}">${esc(STRAINS[inv.strain].name)}</span>` : ''}`;
  return `<section class="card inv-card ${inv.state}"><h2>Invasion</h2><h1>${esc(inv.name)}</h1><p class="svc-line tagline">${tags}</p><p class="svc-line quiet">from ${esc(inv.fromName)}</p>
    <div class="inv-state"><span class="tag ${inv.state === 'breach' ? 'hot' : inv.state === 'siege' || inv.state === 'watch' ? 'warn' : ''}">${esc(inv.state === 'travel' ? (tgt ? `to ${tgt.name}` : 'on its way') : inv.state === 'watch' ? 'mapping' : inv.state === 'siege' ? 'contested' : 'breach')}</span><b>${esc(invaderShort(s))}</b></div>
    <div class="wall-bar ${inv.state}"><span style="width:${Math.max(0, Math.min(100, Math.round(pct)))}%"></span></div>
    ${tellOf(s, inv) ? `<p class="inv-tell">${esc(tellOf(s, inv))}</p>` : ''}
    <p class="svc-line">${glyph('firewall')} ${tgt ? `${esc(tgt.name)}'s firewall` : 'Your firewall'} <b>lv ${lv}</b> <span class="tag ${verdict[0]}">${verdict[1]}</span></p>
    ${bountyChips(s, inv)}
    <div class="row">${(inv.state !== 'travel' || st?.intercept) && st ? jackInButton(st) : ''}${hardenAnswer(s, inv)}<button type="button" class="btn" data-go="server">Firewall</button></div></section>`;
}
// Server architecture: picked at server level 20, a trade each way.
// ---------- networks (network.mjs) ----------
// A network's card: what you've learned about it by playing there (network.mjs intelOf). The families you've beaten
// as a bar, then its strain, boss, events and riches as ??? until you've found each, and its natives as ??? until named.
const NATIVE_SLOT = (id) => SLOTS[BASES[UNIQUES[id]?.base]?.slot]?.name || '';
export function networkCardMarkup(s, who = 'you', opts = {}) {
  const g = sigOf(s, who);
  if (!g) return '';
  // Only what you've learned by playing on it (network.mjs intelOf): nothing here is told.
  const n = intelOf(s, who), fought = Object.entries(n.fam).filter(([f]) => FAMILIES[f]).sort((a, b) => b[1] - a[1]); // saves from before this kept guards' too
  const total = fought.reduce((a, [, k]) => a + k, 0);
  const lean = fought.length
    ? `<div class="lean-bar">${fought.map(([f, k], i) => `<span class="lean-seg l${Math.min(i, 2)}" style="width:${Math.round((k / total) * 100)}%" title="${esc(FAMILIES[f].name)}: ${k} of the ${total} viruses you've beaten here">${glyph(codeOf(f))}${esc(FAMILIES[f].name)}</span>`).join('')}</div>`
    : '<p class="net-none">Nothing beaten here yet. What runs on it shows here as you fight.</p>';
  const unknown = '<span class="coll-q">???</span>';
  const lair = who === 'you' ? lairOf(s) : memberServers(s).find((l) => l.id === `${who}-lair`);
  const B = BOSSES[g.boss];
  const bossLine = lair ? `<button type="button" class="act" data-go="map:${who === 'you' ? '' : 'con='}${esc(lair.id)}" title="${esc(B.about)}">${glyph('kill')}${esc(B.name)}</button><small>${esc(lair.name)}</small>` : unknown;
  const events = who === 'you' ? g.events.filter((k) => knowsEvent(s, k)) : [];
  const rows = [
    ['Strain', knowsStrain(s, who) ? `<span class="tag" title="${esc(STRAINS[g.strain].rule)}">${esc(STRAINS[g.strain].name)}</span><small>turns up often</small>` : unknown],
    ['Boss', bossLine],
    ...(who === 'you' ? [['Events', events.length ? events.map((k) => `<span class="tag">${esc(EVENT_CARDS[k]?.name || k)}</span>`).join('') + '<small>come up often</small>' : unknown]] : []),
    ['Rich in', knowsRich(s, who) ? `<span class="tag">${glyph(g.code.rich)}${esc(MATERIALS[g.code.rich].short)}</span><span class="tag">${glyph(g.code.extra === 'salvage' ? 'salvage' : 'exploit')}${g.code.extra === 'salvage' ? 'Components' : 'Exploits'}</span>` : unknown],
  ].map(([k, v]) => `<div class="net-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const posts = postsOf(s);
  const natives = g.uniques.map((id) => {
    const u = UNIQUES[id], known = named(s, id), got = !!s.collection?.[id];
    const listen = known && posts && !got ? (s.listen === id ? '<span class="tag hot" title="Your Listening Posts make it likelier">listening</span>' : `<button type="button" class="act dim" data-run="listen ${esc(id)}" title="Listen for it">listen</button>`) : '';
    return known
      ? `<li class="net-native${got ? ' on' : ' heard'}" title="${esc(`${effectLine({ unique: id })} ${u.flavour || ''}`)}"><b class="iname r-zeroday">${esc(u.name)}</b><small>Lv ${u.level} · ${esc(NATIVE_SLOT(id))}${got ? ' · found' : ''}</small>${listen}</li>`
      : '<li class="net-native" title="Not seen or named yet"><span class="coll-q">???</span></li>';
  }).join('');
  const dark = who === 'you' ? eventsOf(s).filter((ev) => ev.card === 'darknet') : [];
  const darkRows = dark.map((ev) => darknetCard(s, ev)).join(''); // a darknet listing (event-cards.mjs)
  return `<section class="card net-card" data-net="${esc(who)}"><h2 title="A network's signature comes from its seed">Network · ${esc(whoLabel(who))}</h2><h1>${esc(g.name)}</h1>
    ${lean}<dl class="net-rows">${rows}</dl>
    <h3 class="net-sub">Native</h3><ul class="net-natives">${natives}</ul>${darkRows}${opts.extra || ''}</section>`;
}

// The Server page lives in server-view.mjs.
export { serverMarkup } from './server-view.mjs';

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

const NET_CLASS = { 'net-scan': 'scan-li', 'net-cmd': 'you', 'net-err': 'warn', 'net-good': 'good', 'net-file': 'file', 'net-ls': 'ls', 'net-sweep': 'sweep-li', 'net-out': 'note', 'run-start': 'good', intrusion: 'bad', victory: 'good', crashed: 'bad', disconnected: 'bad', 'jacked-out': 'good', trap: 'bad', 'pack-hit': 'bad', lead: 'good', located: 'good', warning: 'warn' };

// Who's in a SPRAWL-00 folder (presence.mjs): a dot each, friends lit, a name on hover.
const peopleChips = (list = []) => (list.length ? `<span class="ls-people" title="${esc(list.map((x) => x.handle + (x.fighting ? ' (fighting)' : '')).join(', '))}">${list.slice(0, 3).map((x) => `<span class="who${x.crew ? ' crew' : x.friend ? ' friend' : x.member ? ' member' : ''}${x.fighting ? ' fighting' : ''}">${esc(x.handle)}</span>`).join('')}${list.length > 3 ? `<span class="who more">+${list.length - 3}</span>` : ''}</span>` : '');
function lsMarkup(e) {
  const pulls = e.entries.filter((x) => x.pull).length;
  return `${e.here?.length ? `<div class="ls-here">here ${peopleChips(e.here)}</div>` : ''}<div class="ls">${pulls >= 2 ? `<div class="ls-all"><button type="button" class="tok act" data-run="pull all" title="Every file here into your pack">pull all · ${pulls}</button></div>` : ''}${e.entries.map((x) => {
    const tags = x.tags.filter((t) => !(t === 'pull' && x.pull)).map((t) => t === 'crew' ? '<span class="tag tag-crew" title="Crew room: an elite, built for a party. It is very hard to beat alone, and drops better loot.">◆ CREW</span>' : `<span class="tag tag-${esc(t)} ${t === 'guarded' || t === 'virus' ? 'warn' : 'dim'}">${esc(t)}</span>`).join('');
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
  return sweepBlock(p, { solved, tries: loc?.state?.sweep?.tries || 0, key: e.location });
}
// The sweep itself (its log, the filters, the suspects): the old runs' incident file, and a thread's process log on a
// temporary server (threads-view.mjs). solved: the answer once found; tries: wrong answers so far.
export function sweepBlock(p, { solved = null, tries = 0, key = '' } = {}) {
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
  return earlier + lines.map((e, i) => `<li class="${NET_CLASS[e.type]}">${e.type === 'net-ls' && e.entries ? lsMarkup(e) : e.type === 'net-sweep' && e.sweep ? sweepMarkup(s, e, i === lastSweep) : e.type === 'net-scan' && e.card ? scanMarkup(e) : esc(e.message) + suggestButton(e)}</li>`).join('');
}


export const signalLevel = (run) => (run.integrity / run.max <= 0.3 ? 'low' : run.integrity / run.max <= 0.6 ? 'mid' : 'ok');

// On a run, the Leads panel (toggled from the run's header): every trace in progress. A family's
// lead (kills of it), and each unknown server you can see (where it hangs off, its layer), with its
// percent; a contract's marker on the flagged ones. Click one to see it on the map.
function leadsPanel(s) {
  const fams = [];
  const nodes = shownHidden(s);
  const bar = (n) => `<span class="ld-bar"><span style="width:${Math.min(100, n)}%"></span></span><b class="ld-n">${Math.floor(n)}%</b>`;
  const famRows = fams.map(([f, n]) => `<li class="ld-row" data-go="map:lead-${esc(f)}" title="${esc(FAMILIES[f].name)} lead">${glyph(f)}<span class="ld-name">${esc(FAMILIES[f].name)}</span>${bar(n)}</li>`).join('');
  const nodeRows = nodes.map((n) => { const via = s.locations.find((l) => l.id === n.via); const flag = hiddenFlagged(s, n); return `<li class="ld-row${flag ? ' wanted' : ''}" data-go="map:${esc(n.id)}" title="Unknown ${n.pinged || n.seen ? esc(FAMILIES[n.family].name.toLowerCase()) + ' ' : ''}server past ${esc(viaName(s, n))}">${glyph('trace')}<span class="ld-name">? <small>${esc(viaName(s, n))} · F${n.depth}</small></span>${flag ? `<span class="ls-job">${glyph('contract')}</span>` : ''}${bar(n.lead)}</li>`; }).join('');
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
      ${!loc.zone && !loc.rogue ? `<div class="net-trace${(s.run.trace || 0) >= 70 ? ' hot' : (s.run.trace || 0) < TRACE.clean ? ' low' : ''}${s.run.hunter ? ' hunted' : ''}" title="Trace: how loud this break-in has been. Moves, pulls, wrong passwords and fights raise it, and Spoof lowers it. At 100 a hunter comes and you can't jack out until it's down. Under ${TRACE.clean}% with the vault open, it is a clean job worth 25% more credits."><span class="lbl">Trace</span><span class="sigbar"><span style="width:${s.run.trace || 0}%"></span></span><strong>${s.run.hunter ? 'HUNTED' : (s.run.trace || 0) + '%'}</strong></div>` : ''}
      ${s.run.hot ? `<span class="tag hot net-hot" title="${esc(LOUD_TIP)}">loud</span>` : ''}
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
// The Loadout's Daemons tab is daemons-view.mjs (the party, the bench, the roster and the panel).
import { daemonsMarkup, daemonUi } from './daemons-view.mjs';
export { daemonsMarkup, daemonUi };
// A daemon's glyph as a small icon (the Daemons tab draws sprites instead; daemon-sprites.mjs).
const DAEMON_GLYPH = { breakpoint: 'cut', nudge: 'hit', drain: 'leech', kindle: 'burn', airbag: 'shield', crowbar: 'scrap', flare: 'crit', wiretap: 'ids', capacitor: 'shield', backscatter: 'countermeasures', drill: 'spike', afterburn: 'burn', lookout: 'watchman', checkpoint: 'snapshot', leash: 'upload', sieve: 'scrubber', ricochet: 'echo', spite: 'claw', domino: 'kill', rod: 'stun', overseer: 'hit', reaper: 'kill', broadcast: 'uplink', void: 'stall', pendulum: 'sync', sledge: 'damage', hotspare: 'repair', lifeline: 'heal', tandem: 'mirror', guillotine: 'cut' };
export const daemonGlyph = (id, cls = 'badge') => glyph(DAEMON_GLYPH[id] || id, cls);

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
    <div class="c-head"><b>${glyph({ kill: 'kill', strain: 'kill', bounty: 'bounty', takeover: 'takeover', materials: 'materials', item: 'item', side: 'f-' + c.faction, install: 'canary', defuse: 'lock', sweep: 'trace', exfil: 'upload', heist: 'stealth' }[c.type] || 'item', 'badge')}${esc(contractTitle(s, c))}</b>${c.offBooks ? '<span class="tag hot">Off the books</span>' : ''}${isOffer && c.type !== 'side' && !c.waits ? `<small class="c-exp">expires in ${fmtTime(c.expiresAt - now)}</small>` : isOffer && c.type === 'side' ? '<span class="tag you">your call</span>' : ''}</div>
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
    if (sel?.[0] === 't') { const t = threadById(s, sel); if (t) return { thread: t }; } // a thread (threads.mjs)
    const l = letters.find((m) => !m.read);
    if (l && l.job != null && jobs.has(l.job)) { const j = findJob(s, l.job); if (j) return { job: j }; } // shown as its contract
    if (l) return { letter: l };
    if (held[0]) return { job: held[0] };
    return letters[0] ? { letter: letters[0] } : {};
  };
  const open = pickSel();
  const isOpen = (k) => (open.letter && k === 'l' + open.letter.id) || (open.job && k === 'j' + open.job.id);
  // f: whose job it is, as a mark at the row's left edge. A letter or a LOWLIGHT job keeps the column empty, so rows line up.
  const row = (k, from, subject, tag, cls, extra = '', unreadRow = false, f = null) => `<li><button type="button" class="mrow has-f${unreadRow ? ' unread' : ''}${isOpen(k) ? ' open' : ''}" data-mail="${k}">${f && FX[f] ? fIcon(f, 'mrow-f') : '<span class="mrow-f mrow-none" aria-hidden="true"></span>'}<span class="mfrom">${esc(from)}</span><span class="msubj">${esc(subject)}</span>${tag ? `<span class="tag ${cls}">${tag}</span>` : extra}</button></li>`;
  // A letter that came with a contract you took shows once: as that contract (Contracts or Completed).
  const taken = new Set((s.mail?.jobs || []).map((j) => j.id));
  const unreadJob = new Set(letters.filter((m) => m.job != null && taken.has(m.job) && !m.read).map((m) => m.job));
  const unreadLetters = letters.filter((m) => !m.read && !(m.job != null && taken.has(m.job))).length;
  const heldRows = held.map((c) => { const [t, cls] = jobTag(s, c); return row('j' + c.id, c.from, contractTitle(s, c), t, cls, '', unreadJob.has(c.id), c.faction || (c.story !== undefined || /LOWLIGHT/.test(c.from) ? null : 'halcyon')); }).join('');
  const boardRows = board.map((c) => row('j' + c.id, c.from, c.subject, c.offBooks ? '<span title="GLASSJAW work through Halcyon\'s board: pays 1.6× the credits, costs Halcyon standing">Off books</span>' : '', c.offBooks ? 'hot' : '', `<small class="mexp">${c.type === 'side' ? '<span title="A side offer: take this one or its rival. It never expires.">pick one</span>' : c.waits ? '<span title="A room contract: it waits until you take it.">waits</span>' : fmtTime(c.expiresAt - now)}</small>`, false, c.faction || 'halcyon')).join('');
  const letterRows = letters.filter((m) => m.job == null || !taken.has(m.job)).map((m) => row('l' + m.id, m.from, m.subject, '', '', '', !m.read)).join('');
  const done = doneContracts(s);
  const doneRows = done.map((c) => row('j' + c.id, c.from, contractTitle(s, c), c.story !== undefined ? '<span title="A job from LOWLIGHT, your crew: the storyline">LOWLIGHT</span>' : '', 'dim', '', false, c.faction || (c.story !== undefined || /LOWLIGHT/.test(c.from) ? null : 'halcyon'))).join('');
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
  if (open.thread) reader = threadReader(s, open.thread);
  else if (item) {
    const j = open.job || (open.letter.job != null ? findJob(s, open.letter.job) : null);
    const body = item.body?.length ? item.body : letters.find((m) => m.job === item.id)?.body || []; // a contract reads as its letter
    reader = `<section class="card mread"><h2>${esc(item.from)}</h2><h1>${esc(item.subject)}</h1><div class="mbody">${body.filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('')}</div>${j ? jobBox(s, j, now) : ''}</section>`;
  }
  return `<div class="page-grid mail-page"><section class="card inbox">${head}
    <h2>Contracts · ${heldCount(s)}/${MAIL.take}</h2>${heldRows ? `<ul class="mlist">${heldRows}</ul>` : '<p class="quiet">None taken.</p>'}
    ${threadRows(s, open.thread?.id || null)}
    ${boardOpen(s) ? `<h2>Board · ${board.length}</h2>${boardRows ? `<ul class="mlist mboard">${boardRows}</ul>` : '<p class="quiet">Nothing on offer right now.</p>'}` : ''}
    ${letterRows ? `<h2>Letters${unreadLetters ? ` · ${unreadLetters} unread` : ''}</h2><ul class="mlist">${letterRows}</ul>` : ''}
    ${done.length ? `<h2 class="mdone-head">Completed · ${done.length}</h2><ul class="mlist mdone">${doneRows}</ul>` : ''}</section>${reader}</div>`;
}

// A follow-up's line (events.mjs chains): the chain mark, the event that caused it on hover (the sidebar's Needs you).
const chainMk = (c) => (c.chain ? `<i class="cchain" title="${esc(c.chain)}" role="img" aria-label="${esc(c.chain)}">${glyph('chain')}</i>` : '');

// ---------- people (presence.mjs): friends and who's online ----------
export function peopleMarkup(s, tab = 'friends', now = Date.now()) {
  const all = online(s, now), crew = (s.crewSim || []).map((x) => x.name);
  const c = consortiumOf(s), inv = s.consortiumInvite;
  const row = (x) => `<li class="person${x.friend ? ' friend' : ''}${x.member ? ' member' : ''}"><span class="p-dot${x.place.fighting ? ' fighting' : ''}"></span><b class="p-handle" data-finger="${esc(x.handle)}" title="finger ${esc(x.handle)}">${esc(x.handle)}</b><small>${esc(ARCHETYPES[x.cls].name)} ${x.level}</small><span class="p-where">${esc(whereText(x.place))}</span>
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
      return `<li class="person crewmate"><span class="p-dot${p || onRun ? '' : ' off'}"></span><b class="p-handle" data-finger="${esc(x.name)}" title="finger ${esc(x.name)}">${esc(x.name)}</b><small>${esc(ARCHETYPES[x.cls].name)}${p ? ` ${p.level}` : ''}</small><span class="p-where">${where}</span>
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
// members. Right: the consortium and its size ladder, and how your server fares while away.
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
// A member's network in a chip (the Consortium page): its name, lead family and native strain; the rest on hover.
const netChip = (s, h) => { const g = sigOf(s, h); if (!g) return ''; const known = [knowsStrain(s, h) && `${STRAINS[g.strain].name} turns up often`, g.uniques.some((id) => named(s, id)) && `Natives: ${g.uniques.filter((id) => named(s, id)).map((id) => UNIQUES[id].name).join(', ')}`].filter(Boolean); return `<button type="button" class="cm-net act dim" data-go="map:member-${esc(h)}" title="${esc(`${g.name}. ${known.length ? known.join('. ') + '.' : 'Play on it to learn what runs there.'}`)}">${glyph('router')}${esc(g.name)}</button>`; };
export function consortiumMarkup(s, now = Date.now()) {
  const c = consortiumOf(s), inv = s.consortiumInvite, busy = active(s) || !!s.run;
  if (!c) {
    const invite = inv ? `<section class="card alert"><h2>Invite · ${fmtTime(inv.left)} left</h2><h1>${esc(inv.name)}</h1>
      <p class="svc-line" title="Merge: reach their servers, keep everything of yours">${glyph('router')} ${esc(inv.from)} · ${inv.members.length + 1} members</p>
      <div class="row">${btn('consortium accept', 'Merge', true)}${btn('consortium decline', 'Decline')}</div></section>` : '';
    return `<div class="page-grid"><div class="con-col">${invite}<section class="card"><h2>Consortium</h2><h1 title="Merge servers with other hackers: reach each other's servers, and a bigger network pays everyone">None</h1>
      <div class="row"><button type="button" class="btn ${inv ? '' : 'primary'}" data-prefill="consortium create ">Found one</button></div></section></div></div>`;
  }
  const alerts = alertsOf(s), on = online(s, now), onSet = new Set(on.map((x) => x.handle));
  const crew = (s.crewSim || []).map((x) => x.name);
  const member = (h) => {
    const p = on.find((x) => x.handle === h) || { ...profileOf(h), place: null };
    const mine = serversOf(s, h), raid = c.raid?.member === h, down = rebooting(s, h);
    const state = raid ? '<span class="tag hot">invasion at the wall</span>' : down ? '<span class="tag warn">rebooting</span>' : onSet.has(h) ? '<span class="tag tag-con">online</span>' : '<span class="tag dim">away</span>';
    // One aligned row: who, class and level, servers, where they are, state, actions.
    const there = p.place?.loc ? `map:con=${p.place.loc}` : `map:member-${h}`;
    return `<li class="con-member${onSet.has(h) ? '' : ' off'}${crew.includes(h) ? ' crew' : ''}"><span class="cm-dot${onSet.has(h) ? ' on' : ''}"></span><span class="cm-name"><b>${esc(h)}</b>${crew.includes(h) ? `<span class="cm-crew" title="In your crew">${glyph('run')}</span>` : ''}${c.founder === h ? '<small title="Founder">★</small>' : ''}</span>
      <span class="cm-cls">${esc(ARCHETYPES[p.cls].name)} <b>${memberLevel(s, h)}</b></span>
      ${netChip(s, h)}
      <span class="cm-n" title="Servers">${glyph('node')}${mine.length}</span>
      <button type="button" class="cm-where act dim" data-go="${esc(there)}" title="Show on the map">${glyph('trace')}${p.place ? esc(whereText(p.place)) : 'home'}</button>
      <span class="cm-state">${state}</span>
      <span class="p-acts">${crew.includes(h) ? `<button type="button" class="act dim" data-run="crew kick ${esc(h)}">Remove from crew</button>` : onSet.has(h) ? `<button type="button" class="act" data-run="crew invite ${esc(h)}" ${crew.length >= 3 ? 'disabled' : ''}>Invite to crew</button>` : ''}${c.founder === 'you' ? `<button type="button" class="act dim" data-run="consortium kick ${esc(h)}">Kick</button>` : ''}</span></li>`;
  };
  const size = sizeOf(s), have = conTiers(s).length;
  const ladder = CONSORTIUM.tiers.map((t) => `<li class="${size >= t.at ? 'on' : ''}"><span class="tier-at">${t.at}</span><b>${esc(t.name)}</b><small>${esc(t.rule)}</small></li>`).join('');
  return `<div class="page-grid con-page"><div class="con-col">
    <section class="card"><h2>Needs you${alerts.length ? ` · ${alerts.length}` : ''}</h2>
      ${alerts.length ? `<div class="con-alarms">${alerts.map((a) => alarmCard(s, a, busy)).join('')}</div>` : '<p class="quiet">All quiet on the trunk line.</p>'}</section>
    <section class="card"><h2>Members · ${c.members.filter((h) => onSet.has(h)).length} online of ${c.members.length}</h2>
      ${c.members.length ? `<ul class="con-members">${c.members.map(member).join('')}</ul>` : '<p class="quiet">Just you</p>'}</section>
  </div><div class="con-col">
    <section class="card"><h2>Consortium</h2><h1>${esc(c.name)}</h1>
      <p>${size} servers merged · founded by ${esc(c.founder)} · ${memberServers(s).length} servers on the network</p>
      <ol class="con-ladder">${ladder}</ol></section>
    ${networkCardMarkup(s, 'you')}
    <section class="card"><h2>While you're away</h2>${awayLine(s)}<div class="row">${btn('server', 'Firewall')}</div></section>
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
    <section class="card"><h2>Codebases</h2><ul class="plan-shelf">${shopCodebases(s, 'halcyon', L).map((x) => `<li class="${x.known ? 'known' : ''}"><span class="iname" title="${esc(PROGRAMS[x.id].rule)}">${glyph('module')}${esc(PROGRAMS[x.id].name)}</span><span class="tag dim">${PROGRAMS[x.id].weight}</span>${x.known ? '<span class="tag dim">known</span>' : tierAt < x.tier ? `<span class="tag dim">${esc(TIERS[x.tier].name)}</span>` : `<span class="price">${x.price}</span><button type="button" class="btn small ${credits >= x.price ? 'primary' : ''}" data-command="buy codebase-${x.id}" ${credits >= x.price ? '' : 'disabled'}>Buy</button>`}</li>`).join('')}</ul></section>
    <section class="card"><h2>Your kit</h2><div class="stats">${kit}</div></section></div>
    <section class="card"><h2>Agency stock</h2><ul class="ptiles stash">${shelf || '<li class="quiet">The shelves are empty.</li>'}</ul></section></div>`;
}

// ---------- loadout: the classes, then its tabs ----------
// `view` is the archetype being browsed (class/subclass on Skills and talents); the equipped one is s.loadout.archetype.
export const className = (id) => ARCHETYPES[id]?.name || id;
export const xpNeeded = (level) => xpToNext(level);

// ui: the Skills and talents page's own (skills-view.mjs): the item picked for its detail panel, and the phone's sheet.
export function loadoutMarkup(s, view, tab = 'protocols', ui = {}) {
  const equippedArch = s.loadout?.archetype || 'breaker';
  const [vc] = String(view || '').split('/');
  const id = ARCHETYPES[vc] ? vc : equippedArch;
  const a = ARCHETYPES[id];
  const busy = active(s) || !!s.run; // classes change at home, between fights
  const free = subOf(s, id) ? Math.max(0, talentPoints(s, id) - pointsSpent(s, id)) + (capState(s, id) === 'open' ? 1 : 0) : 0; // with no subclass, its points wait for the tree

  // The classes, one slim button each (its level, a teal lamp on the one in use): click to look at it. Looking at
  // one you aren't playing, Use switches to it, at home (and while trying classes out, your level comes with you).
  const tabs = Object.entries(ARCHETYPES).map(([k, x]) => `<button type="button" class="arch${k === id ? ' on' : ''}" data-arch="${k}" aria-pressed="${k === id}" title="${esc(x.role.join(' · '))}"><b>${esc(x.name)}</b><span>Lv ${hackerLevel(s, k)}</span>${k === equippedArch ? '<i class="arch-inuse" title="In use"></i>' : ''}</button>`).join('')
    + (id === equippedArch ? '' : `<button type="button" class="btn small arch-use" data-command="archetype ${id}" ${busy ? 'disabled title="At home only"' : `title="Play ${esc(a.name)}"`}>Use ${esc(a.name)}</button>`);

  return `<div class="loadout">
    <nav class="arch-tabs" aria-label="Classes">${tabs}</nav>
    <nav class="ltabs" role="tablist" aria-label="Loadout">${[['protocols', 'Protocols'], ['daemons', `Daemons${newOn(s, 'daemons') ? ` · ${newOn(s, 'daemons')} new` : ''}`], ['program', 'Program'], ['skills', `Skills and talents${free ? ` · ${free} free` : ''}`]].map(([k, l]) => (k === 'program' && !routinesOpen(s) ? `<button type="button" role="tab" class="ltab-locked" data-ltab="${k}" aria-selected="${tab === k}" aria-disabled="true" title="${esc(ROUTINES_LOCKED)}">${esc(l)}</button>` : `<button type="button" role="tab" data-ltab="${k}" aria-selected="${tab === k}">${esc(l)}</button>`)).join('')}</nav>
    ${tab === 'daemons' ? daemonsMarkup(s) : tab === 'program' ? programMarkup(s) : tab === 'skills' ? skillsTabMarkup(s, view || id, ui) : id === equippedArch ? `
    <div class="loadout-protocols silk">${protocolGearMarkup(s)}</div>` : `
    <div class="loadout-protocols one"><section class="card"><h2>Protocols</h2><p class="svc-line"><span class="tag dim" title="Protocols belong to the class in use">${esc(a.name)} only</span></p></section></div>`}
    </div>`;
}

// ---------- the map ----------
function homeBars(s, y = 50) {
  // Under HOME on the map: the server's Integrity as a bar (teal, amber below 60%, red below 30%).
  const srv = s.server, f = Math.max(0, Math.min(1, srv.integrity / srv.max)), hue = f <= 0.3 ? 'low' : f <= 0.6 ? 'mid' : '';
  return `<g transform="translate(0 ${Math.round(y * 10) / 10})"><g class="mbars"><g class="hb hp ${hue}"><title>Integrity ${srv.integrity}/${srv.max}</title><rect x="-28" y="-2" width="56" height="4" rx="1" class="hb-track"/><rect x="-28" y="-2" width="${(56 * f).toFixed(1)}" height="4" rx="1" class="hb-fill"/></g></g></g>`;
}
// The network map is one floor at a time (floors.mjs, docs/servers.md 5): that floor's diagram, at its slots' places.
// Home sits above the stack, over the floor's entry (floor 1's is SPRAWL-00, the rest an up-link ▲), and every
// connection starts there. Servers you've located sit at their slots; a server linked to one you've found shows as ?;
// exits (▼) always show, through the fog. Hubs you've found stand on their floors. Labels go outward from the floor's
// middle.
const rad = (d) => (d * Math.PI) / 180;
const at = (angle, r) => ({ x: Math.round(Math.cos(rad(angle)) * r), y: Math.round(Math.sin(rad(angle)) * r), angle, r });

// The intrusion at your gate: the current one, or one parked while you fought an invader.
export function gateOf(s) {
  const e = s.encounter;
  if (e && e.mode !== 'run' && !e.invader && (e.phase === 'alert' || e.phase === 'active')) return e;
  return s.gate || null;
}
// The floor a map selection sits on (a server, a ?, an exit, a hub), or null (home, the threat rail's).
export function floorOfSel(s, sel) {
  if (!sel || sel === 'server' || sel === 'invader' || sel === 'intrusion') return null;
  if (sel === CONFIG.zone.id) return 1;
  if (floorOfSlot(sel)) return floorOfSlot(sel);
  if (sel.startsWith('hub-')) return FLOOR.hubs[sel.slice(4)] || null;
  const l = (s.locations || []).find((x) => x.id === sel);
  if (l) return l.slot ? l.depth || 1 : null;
  const tl = (s.threads?.servers || []).find((x) => x.id === sel); // a thread's temporary server (threads.mjs)
  if (tl) return tl.depth || 1;
  const h = (s.hidden || []).find((x) => x.id === sel);
  return h?.depth || null;
}
// The floor the map shows: the selection's, else the one asked for, else the one you last went to.
export const mapFloorOf = (s, sel, floor = null) => Math.min(floorsOf(s).reached, floorOfSel(s, sel) || floor || floorsOf(s).at || 1);
// A tall screen (the phone layout) turns a floor on its side: the entry at the top, the way down at the bottom.
let mapPortrait = false;
export const setMapPortrait = (on) => { const was = mapPortrait; mapPortrait = !!on; return was !== mapPortrait; };
export function mapLayout(s, floor = null, portrait = mapPortrait) {
  const F = floorsOf(s), n = Math.max(1, Math.min(F.reached, floor || F.at || 1)), g = graphOf(s, n);
  zoneSpawns(s);
  const nodes = [], links = [], byId = {}, idOf = {};
  const all = Object.values(g.nodes).map((x) => (portrait ? { ...x, x: x.y, y: x.x } : x)), cx = (Math.min(...all.map((x) => x.x)) + Math.max(...all.map((x) => x.x))) / 2, cy = (Math.min(...all.map((x) => x.y)) + Math.max(...all.map((x) => x.y))) / 2;
  const put = (node, slot) => { node.angle ??= Math.atan2(node.y - cy, node.x - cx) * 180 / Math.PI; nodes.push(node); byId[node.id] = node; if (slot) idOf[slot] = node.id; return node; };
  // Home, above the floor (the stack hangs under it), straight over the floor's entry and linked down to it: every
  // connection starts there. (An entry sits at the floor's edge or between its arms, so the line crosses nothing.)
  const entry = all.find((x) => x.id === g.entry), top = Math.min(...all.map((x) => x.y));
  const home = put({ id: 'server', kind: 'server', x: entry.x, y: top - 150, angle: -90, r: 0 });
  if (n === 1) put({ id: CONFIG.zone.id, kind: 'zone', x: entry.x, y: entry.y }, g.entry);
  else put({ id: g.entry, kind: 'entry', floor: n, x: entry.x, y: entry.y }, g.entry);
  links.push({ from: 'server', to: idOf[g.entry], ghost: true });
  const e = gateOf(s);
  if (e) { put({ id: 'intrusion', kind: 'intrusion', x: home.x + 64, y: home.y + 34, angle: 0, virus: e.virus, fighting: e.phase === 'active' }); links.push({ from: 'server', to: 'intrusion', hot: true }); }
  // The floor's slots: located servers, ?s, exits, hubs you've found.
  const hubs = new Set(hubsOf(s).map((h) => h.faction));
  for (const x of all) {
    if (x.kind === 'entry') continue;
    // An exit stays off the map until a server beside it is found (or you've been below): no floor below shows at the start.
    if (x.kind === 'exit') { const open = exitOpen(s, x.id); if (open || x.to <= floorsOf(s).reached) put({ id: x.id, kind: 'exit', to: x.to, open, x: x.x, y: x.y }, x.id); continue; }
    if (x.kind === 'hub') { if (hubs.has(x.hub)) put({ id: 'hub-' + x.hub, kind: 'hub', hub: hubsOf(s).find((h) => h.faction === x.hub), x: x.x, y: x.y }, x.id); continue; }
    const l = locAt(s, x.id);
    if (l) { put({ id: l.id, kind: 'location', loc: l, x: x.x, y: x.y }, x.id); continue; }
    const h = hiddenAt(s, x.id);
    if (h) put({ id: h.id, kind: 'hidden', hidden: h, x: x.x, y: x.y }, x.id);
  }
  // A thread's temporary servers on this floor (threads.mjs): beside the server they grew from, a dashed link to it.
  for (const t of tempNodes(s, n)) { const node = put(portrait ? { ...t, x: t.y, y: t.x } : t); const host = byId[t.host]; if (host) links.push({ from: host.id, to: node.id, ghost: true, temp: true }); }
  // Links between what's drawn: solid between found places, a ghost line to a ? or an exit you can't take yet.
  for (const [a, b] of g.links) {
    const A = byId[idOf[a]], B = byId[idOf[b]];
    if (!A || !B) continue;
    const ghost = [A, B].some((x) => x.kind === 'hidden' || (x.kind === 'exit' && !x.open) || x.kind === 'hub');
    links.push({ from: A.id, to: B.id, ghost });
  }
  // A thread's file in transit between two servers here: on the way between them (threads.mjs).
  for (const t of transitNodes(s, byId, idOf, portrait ? { links: g.links } : g)) put(t);
  // The invader: from its server when it's on this floor, else up through the entry; it stops just outside home.
  const inv = s.invasion, src = inv && (byId[inv.from] || byId[idOf[g.entry]]);
  if (src) {
    const tgt = inv.target && byId[inv.target];
    const dx = src.x - home.x, dy = src.y - home.y, len = Math.hypot(dx, dy) || 1;
    const wall = tgt ? { x: Math.round(src.x + (tgt.x - src.x) * 0.85), y: Math.round(src.y + (tgt.y - src.y) * 0.85) } : { x: Math.round(home.x + (dx / len) * 70), y: Math.round(home.y + (dy / len) * 70) };
    const start = tgt ? src : { x: src.x - (dx / len) * 30, y: src.y - (dy / len) * 30 };
    const p = inv.state === 'travel' ? Math.round((1 - inv.left / inv.total) * 50) / 50 : 1; // 2% steps
    nodes.push({ id: 'invader', kind: 'invader', inv, x: Math.round(start.x + (wall.x - start.x) * p), y: Math.round(start.y + (wall.y - start.y) * p) });
    links.push({ from: src.id, to: 'invader', hot: inv.state === 'breach', ghost: inv.state === 'travel' });
  }
  return { nodes, links, floor: n };
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
  const threat = !!eventsAt(s, l.id).length;
  const mine = !!l.takenOver;
  const fresh = !!(l.fresh && l.detached);
  const target = job || fresh || (st === 'new' && !l.rogue && !mine);
  const minor = st !== 'here' && !threat && !job && !fresh && (s.locations.includes(l) && !isLive(s, l) || l.rogue || st === 'done' || (mine && !programsOn(l).length));
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
const label = (n, r, name, sub, cls = '') => { const p = labelAt(n, r); return `<text x="${p.x}" y="${p.y}" class="mlabel ${cls}" text-anchor="${p.a}">${esc(name)}</text>${sub ? `<text x="${p.x}" y="${p.y}" dy="1.4em" class="msub" text-anchor="${p.a}">${esc(sub)}</text>` : ''}`; }; // the line under it sits in ems: text keeps its size on screen (--z), so a phone's small map doesn't stack them
// A server's label with its level up front: the level big and coloured by how hard it is for you
// (WoW colours), the layer as a tag, then whatever else (outpost, siege…). The name can hide.
const lvLabel = (s, n, r, name, level, depth, rest = '', cls = '') => {
  const p = labelAt(n, r), gap = level - hackerLevel(s);
  // The layer is the ring it sits on; a server you own needs no level (its colour says it's yours).
  const lv = level != null ? `<tspan class="mlv ${conClass(gap)}" dx="0">lv ${level}</tspan>` : '';
  const sub = lv + (rest ? `<tspan dx="${lv ? 6 : 0}">${esc(rest)}</tspan>` : '');
  return `<text x="${p.x}" y="${p.y}" class="mlabel ${cls}" text-anchor="${p.a}">${esc(name)}</text>${sub ? `<text x="${p.x}" y="${p.y}" dy="1.45em" class="msub" text-anchor="${p.a}">${sub}</text>` : ''}`;
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
    ? { cls: inv.quiet ? 'dim' : 'warn', icon: 'kill', name: inv.name, where: inv.target ? `${labelOf(inv).toLowerCase()} · to ${s.locations.find((l) => l.id === inv.target)?.name || 'outpost'}` : `${inv.kind && inv.kind !== 'raider' ? labelOf(inv).toLowerCase() : 'invasion'} · your wall`, tag: `lv ${inv.level}`, left: inv.left, total: inv.total, sel: 'invader', verb: 'arrives' }
    : inv.state === 'watch' ? { cls: 'hot', icon: 'kill', name: inv.name, where: 'scout mapping your wall', tag: `lv ${inv.level}`, left: inv.mapLeft, total: SCOUT.mapMs, sel: 'invader', verb: 'leaves' }
    : { cls: 'hot', icon: 'kill', name: inv.name, where: inv.state === 'siege' ? 'contested at your wall' : 'BREACH at your wall', tag: `lv ${inv.level}`, pct: inv.hp, sel: 'invader' });
  else if (threatTop(s) && s.net?.next > 0) add({ cls: 'dim', icon: 'clock', name: 'Next invasion', where: s.net.open ? 'ports open' : 'your wall', left: s.net.next, total: s.net.open ? CONFIG.invasion.everyMs[1] * CONFIG.invasion.open.pace : CONFIG.invasion.everyMs[1], sel: 'server' });
  const r = retakeOf(s);
  if (r) add({ cls: r.state === 'siege' ? 'hot' : 'warn', icon: 'kill', name: `Swarm ×${r.ships}`, where: `${r.state === 'siege' ? 'at' : '→'} your ${FX[r.f].short} hub`, tag: `lv ${r.level}`, left: retakeLeft(s, now), total: r.state === 'travel' ? HUBS.travelMs : HUBS.siegeMs, sel: 'hub-' + r.f, verb: r.state === 'travel' ? 'arrives' : 'falls' });
  for (const h of Object.values(s.hubs || {})) if (h.captured?.lockdown) add({ cls: 'hot', icon: 'takeover', name: 'Lockdown', where: `your ${FX[h.faction].short} hub`, sel: h.id });
  for (const ev of eventsOf(s)) { const c = EVENT_CARDS[ev.card], l = s.locations.find((x) => x.id === ev.loc); add({ cls: 'drop', icon: EVENT_ICON[ev.card] || 'signal', left: ev.left, total: c.ms, sel: l ? l.id : 'server', verb: c.fight ? 'leaves' : 'ends', ...railOf(s, ev, l) }); }
  const sc = s.net?.scouted, scFrom = sc && s.locations.find((l) => l.id === sc.from);
  if (sc) { const row = out.find((x) => x.name === 'Next invasion'); if (row) Object.assign(row, { name: scFrom ? `Next: ${INV_KINDS[sc.kind].name}` : 'Next invasion', tag: `−${sc.levels} lv`, where: scFrom ? `from ${scFrom.name}` : row.where }); }
  const rank = { hot: 0, warn: 1, drop: 2, dim: 3 };
  return out.sort((a, b) => rank[a.cls] - rank[b.cls] || (a.left ?? 0) - (b.left ?? 0));
}
// An event's row on the rail (events.mjs), in the cards' terms: a short name, a tag, where. The icon is its card's.
function railOf(s, ev, l) {
  const where = l?.name || 'the net', lv = `lv ${ev.level}`;
  if (ev.card === 'feud') return { name: ev.sides.map((f) => `${FX[f].short} ${Math.round(feudShare(ev, f) * 100)}%`).join(' · '), where, verb: 'ends' };
  if (ev.card === 'hunt') return { name: ev.name, tag: lv, where: `${where} · ×${HUNT.mult[ev.hop]}`, left: hopLeft(ev), total: HUNT.hopMs };
  if (ev.card === 'shock') return { name: `${ev.mult > 1 ? '▲' : '▼'} ${WARES[ev.ware].name.replace(/ code$/, '')} ×${ev.mult}`, where: `${FX[ev.hub].short} market`, sel: 'hub-' + ev.hub };
  if (ev.card === 'outbreak') return { name: `${FAMILIES[ev.family]?.name || ''} ×2`, where: 'code drops' };
  if (ev.card === 'darknet') return { name: UNIQUES[ev.unique]?.name || '?', where: `${ev.credits}c · ${ev.net}`, verb: 'closes' };
  if (ev.card === 'spotter') return { name: ev.name, tag: lv, where: 'your wall' };
  return { name: ev.name, tag: lv, where };
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
  // The backbone: a curve between each found hub on this floor and the next along.
  const live = hubs.filter((n) => !offline(s, n.hub.faction)).sort((a, b) => a.x - b.x); // the hubs on this floor, left to right
  if (live.length >= 2) {
    live.forEach((a, i) => {
      const b = live[(i + 1) % live.length];
      if (i === live.length - 1) return; // a chain, not a circle
      const id = `bb-${a.hub.faction}-${b.hub.faction}`, bow = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.25); // a curve between two hubs on the floor
      routes.push(`<path class="mbone" data-rid="${id}" d="M${a.x} ${a.y} Q${Math.round((a.x + b.x) / 2)} ${Math.round(Math.min(a.y, b.y) - bow)} ${b.x} ${b.y}"/>`);
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
export function mapMarkup(s, sel = 'server', view = 'mine', { side = true, pop = false, filter = 'all', list = false, sort = 'status', pickOpen = false, build = null, floor = null } = {}) {
  const none = !sel; // nothing selected (you clicked away): no reticle, and the side card shows your server
  sel ||= 'server';
  filter = filterList(filter);
  // A member's server (or home) shows on the consortium's map, whichever view was asked for.
  const con = !!consortiumOf(s) && (view === 'consortium' || sel === 'roamer' || sel.startsWith('member-') || memberServers(s).some((l) => l.id === sel));
  const fl = con ? null : mapFloorOf(s, sel, floor);
  const { nodes, links } = con ? consortiumLayout(s) : mapLayout(s, fl);
  const find = (id) => nodes.find((n) => n.id === id);
  if (!find(sel)) sel = 'server';
  // A steady scale: the scope is at least this big, so a young network isn't blown up huge.
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const mx = con ? 190 : 140, my = con ? 56 : 60; // the consortium's outer ring carries long labels; a floor keeps home clear of the threat rail at its top left
  const minX = Math.min(...xs, -250) - mx, maxX = Math.max(...xs, 250) + mx, minY = Math.min(...ys, -240) - my - (con ? 0 : 60), maxY = Math.max(...ys, con ? 240 : 0) + my + 4;
  const rings = con ? [{ r: RM, t: 'trunk', cls: 'trunk' }] : [];
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
  const scope = con ? `<g class="mscope">${rings.map((g) => { const [x, y] = ringAt(g.r); return `<circle r="${g.r}" class="mring-range ${g.cls || ''}"/><text text-anchor="start" x="${x}" y="${y}" class="mring-label">${g.t}</text>`; }).join('')}
    <line x1="${minX}" y1="0" x2="${maxX}" y2="0" class="maxis"/><line x1="0" y1="${minY}" x2="0" y2="${maxY}" class="maxis"/></g>` : '';
  const lines = links.map((k) => {
    const a2 = find(k.from), b2 = find(k.to);
    return `<line x1="${a2.x}" y1="${a2.y}" x2="${b2.x}" y2="${b2.y}" class="mlink ${k.hot ? 'hot' : ''} ${k.ghost ? 'ghost' : ''} ${k.trunk ? 'trunk' : ''} ${k.temp ? 'tlink' : ''}"/>`;
  }).join('');
  // Labels that would overlap: the more important one keeps its label, the other's comes back on
  // hover, selection or zoom. Importance: selected, under threat, a contract or fresh find, an
  // outpost or where you are, then the rest (quiet servers have no label to begin with).
  const crowded = new Set();
  {
    const z = mapScale || 1, CH = (11 * 0.62 + 1) / z, H = 30 / z, boxes = []; // text keeps its on-screen size: its width in map units grows as the map shrinks
    const rank = (n) => { if (n.id === sel) return 0; const tags = mapTags(s, n.loc, nodeState(s, n.loc), openContracts(s).some((c) => c.loc === n.loc.id)); return tags.includes('minor') ? 9 : tags.includes('f-threat') ? 1 : tags.includes('f-target') && !tags.includes(' f-mine') ? 3 : n.loc.outpost?.h || s.run?.loc === n.loc.id ? 2 : 4; };
    // Every labelled node takes part, not only servers: a lead, an unknown server or a swarm's label can sit on a server's name too.
    const OTHER = { invader: 1, roamer: 1, intrusion: 1, fleet: 1, zone: 2, member: 2, exit: 2, entry: 3, hub: 3, hidden: 5 };
    const SUB = { zone: 24, hub: 15, fleet: 12, invader: 14, roamer: 14, member: 12 }; // the line under the name, where it's the longer one
    const nameOf = (n) => n.loc?.name || n.inv?.name || n.roamer?.name || n.virus?.name || (n.hub ? FX[n.hub.faction]?.short : '') || (n.fleet ? `Swarm ×${n.fleet.ships}` : '') || n.handle || (n.kind === 'exit' || n.kind === 'entry' ? 'Floor 8' : n.kind === 'zone' ? CONFIG.zone.name : '');
    const cands = nodes.filter((n) => (n.kind === 'location' && n.loc) || OTHER[n.kind]).map((n) => ({ n, r: n.kind === 'location' ? rank(n) : n.id === sel ? 0 : OTHER[n.kind] })).filter((c) => c.r < 9).sort((a, b) => a.r - b.r);
    { const h = find('server'); boxes.push([h.x - 5 * CH, h.y + 26 / z, h.x + 5 * CH, h.y + 26 / z + H]); } // HOME's label, under the server
    for (const { n } of cands) {
      const p = labelAt(n, 12), w = Math.max(nameOf(n).length, 10, (SUB[n.kind] || 0) * 0.86) * CH;
      const x0 = n.x + p.x - (p.a === 'end' ? w : p.a === 'middle' ? w / 2 : 0), y0 = n.y + p.y - 11 / z;
      const box = [x0, y0, x0 + w, y0 + H];
      const off = n.id !== sel && (box[0] < minX || box[2] > maxX); // a name the scope's edge would cut in half (a narrow screen) waits too
      if (off || boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) crowded.add(n.id); else boxes.push(box);
    }
  }
  // A bounty hunt's quarry (events.mjs): a dashed line and an arrow from where it sits to where it hops next.
  const trails = eventsOf(s).filter((ev) => ev.card === 'hunt' && ev.next).map((ev) => {
    const a = find(ev.loc), b = find(ev.next);
    if (!a || !b) return '';
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, tx = b.x - ux * 16, ty = b.y - uy * 16, r = (v) => v.toFixed(1);
    return `<g class="mhunt"><title>${esc(`${ev.name} hops to ${b.loc?.name || 'its next server'} in ${fmtLeft(hopLeft(ev))}`)}</title><line x1="${r(a.x + ux * 14)}" y1="${r(a.y + uy * 14)}" x2="${r(tx)}" y2="${r(ty)}"/><path d="M${r(tx)} ${r(ty)} L${r(tx - ux * 7 - uy * 4)} ${r(ty - uy * 7 + ux * 4)} L${r(tx - ux * 7 + uy * 4)} ${r(ty - uy * 7 - ux * 4)} Z"/></g>`;
  }).join('');
  const thMarks = serverMarks(s); // the servers a thread marks (threads.mjs)
  const draw = nodes.map((n) => {
    const on = !none && n.id === sel ? ' selected' : '';
    const pick = on ? reticle(n.kind === 'server' ? 13 : 9) : '';
    if (n.kind === 'server') {
      const srv = s.server;
      const homeEv = eventsOf(s).some((ev) => EVENT_CARDS[ev.card].home); // a spotter at your wall (events.mjs): the antenna
      return `<g class="mnode server${on}${homeEv ? ' drop' : ''}" data-select="server" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Your server"><circle r="26" class="mhit"/><circle r="24" class="halo"/><g class="srv-glyph" transform="translate(-14 -14) scale(1.75)">${GLYPHS.integrity}</g>${homeEv ? '<g class="dropmark" transform="translate(22 -22) scale(1.4)"><path d="M0 4 L0 -3 M-3 -5 Q0 -8 3 -5 M-5 -7 Q0 -12 5 -7"/></g>' : ''}${pick}<text y="38" class="mlabel home" text-anchor="middle">HOME</text>${homeBars(s, 38 + 12 / (mapScale || 1))}<text y="38" dy="2.75em" class="msub" text-anchor="middle">${srv.integrity}/${srv.max}</text></g>`;
    }
    if (n.kind === 'zone') {
      const live = liveSpawns(s), here = s.run?.loc === CONFIG.zone.id;
      return `<g class="mnode zone${here ? ' here' : ''}${on}${crowded.has(n.id) ? ' crowded' : ''}" data-select="${CONFIG.zone.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${CONFIG.zone.name}, rogue server"><circle r="18" class="mhit"/><path d="M0 -9 L8 -4.5 L8 4.5 L0 9 L-8 4.5 L-8 -4.5 Z"/>${live ? `<circle r="2.5" class="zdot"/>` : ''}${pick}${label(n, 10, CONFIG.zone.name, (here ? 'you are here' : live ? `rogue server · ${live} ${live === 1 ? 'virus' : 'viruses'}` : 'rogue server · quiet') + (simOn(s) && inSprawl(s).length ? ` · ${inSprawl(s).length} online` : ''))}</g>`;
    }
    if (n.kind === 'roamer') {
      const r = n.roamer, ang = Math.atan2(n.ty - n.y, n.tx - n.x) * 180 / Math.PI;
      return `<g class="mnode invader travel f-threat${on}${crowded.has(n.id) ? ' crowded' : ''}" data-select="roamer" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Invasion on the trunk line: ${esc(r.name)}"><circle r="18" class="mhit"/><circle r="13" class="vring"/><path class="vbody" d="M0 -9.5 L2.3 -3.8 L8.1 -4.6 L4.3 0 L8.1 4.6 L2.3 3.8 L0 9.5 L-2.3 3.8 L-8.1 4.6 L-4.3 0 L-8.1 -4.6 L-2.3 -3.8 Z"/><circle r="2.6" class="vcore"/>${pick}${label({ ...n, angle: undefined }, 7, r.name, `lv ${r.level} · hop ${r.hop} · ${fmtLeft(r.left)}`, 'hot')}</g>`;
    }
    if (n.kind === 'member') {
      const raid = consortiumOf(s).raid?.member === n.handle, down = rebooting(s, n.handle);
      const sieges = raid ? 1 : 0;
      return `<g class="mnode member${n.online ? ' online' : ''}${sieges ? ' besieged' : ''}${raid ? ' raided' : ''}${down ? ' down' : ''}${on}${crowded.has(n.id) ? ' crowded' : ''}" data-select="${esc(n.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(n.handle)}'s home server"><circle r="18" class="mhit"/><rect x="-7" y="-7" width="14" height="14" rx="2"/>${n.online ? '<circle r="2.5" class="zdot"/>' : ''}${pick}${label(n, 10, n.handle, `${nameOf(s, n.handle) || `lv ${memberLevel(s, n.handle)}`} · ${knowsStrain(s, n.handle) ? STRAINS[sigOf(s, n.handle).strain].name : `${serversOf(s, n.handle).length} servers`}${raid ? ' · invasion at the wall' : down ? ' · crashed' : sieges ? ' · invasion' : ''}`)}</g>`;
    }
    if (n.kind === 'intrusion') {
      return `<g class="mnode intrusion f-threat${on}${crowded.has(n.id) ? ' crowded' : ''}" data-select="intrusion" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Intrusion ${esc(n.virus.name)}"><circle r="18" class="mhit"/><circle r="8" class="pulse"/><path d="M0 -6 L6 0 L0 6 L-6 0 Z"/>${pick}${label(n, 8, n.virus.name, n.fighting ? 'fighting' : `lv ${n.virus.level} · at the gate`, 'hot')}</g>`;
    }
    if (n.kind === 'invader') {
      const inv = n.inv, kind = inv.kind && inv.kind !== 'raider' ? labelOf(inv).toLowerCase() + ' · ' : '';
      const sub = kind + (s.degraded && inv.state !== 'travel' ? 'waiting' : inv.state === 'travel' ? `${fmtLeft(inv.left)} out` : inv.state === 'watch' ? `mapping ${fmtLeft(inv.mapLeft)}` : inv.state === 'siege' ? `contested ${Math.round(inv.hp * 100)}%` : 'breach');
      const ang = Math.atan2(-n.y, -n.x) * 180 / Math.PI; // it points at home
      return `<g class="mnode invader ${inv.state} f-threat${on}${crowded.has(n.id) ? ' crowded' : ''}" data-select="invader" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Invasion: ${esc(inv.name)}"><circle r="18" class="mhit"/><circle r="13" class="vring"/><path class="vbody" d="M0 -9.5 L2.3 -3.8 L8.1 -4.6 L4.3 0 L8.1 4.6 L2.3 3.8 L0 9.5 L-2.3 3.8 L-8.1 4.6 L-4.3 0 L-8.1 -4.6 L-2.3 -3.8 Z"/><circle r="2.6" class="vcore"/>${pick}${label({ ...n, angle: undefined }, 7, inv.name, sub, inv.state === 'breach' ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'hub') {
      const f = n.hub.faction, F = FX[f], t = repTier(s, f);
      return `<g class="mnode hub${hostile(s, f) ? ' hostile' : ''}${offline(s, f) ? ' offline' : ''}${captured(s, f) ? ' yours f-mine' : ''}${lockedDown(s, f) || retakeOf(s)?.f === f ? ' threat f-threat' : ''}${on}${crowded.has(n.id) ? ' crowded' : ''}" style="--fc:${captured(s, f) ? 'var(--you)' : F.color}" data-select="${esc(n.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(F.name)} hub"><circle r="18" class="mhit"/><path d="M0 -13 L13 0 L0 13 L-13 0 Z" class="hub-frame"/><g class="hub-mark" transform="translate(-8 -8)">${GLYPHS['f-' + f]}</g>${shockSvg(s, f)}${pick}${label(n, 14, F.short, lockedDown(s, f) ? 'lockdown' : retakeOf(s)?.f === f ? `swarm · ${fmtLeft(retakeLeft(s))}` : offline(s, f) ? 'hub · offline' : captured(s, f) ? 'your hub' : `hub · ${t.name}`, lockedDown(s, f) || retakeOf(s)?.f === f ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'exit' || n.kind === 'entry') {
      // ▼ the way down (lit through the fog), ▲ the way back up. Its band in WoW colours: what waits there for you.
      const to = n.kind === 'exit' ? n.to : n.floor - 1, [lo, hi] = bandOf(to), L = hackerLevel(s), been = to <= floorsOf(s).reached;
      const band = `<tspan class="mlv ${conClass(lo - L)}">lv ${lo}</tspan><tspan class="mlv ${conClass(hi - L)}">–${hi}</tspan>`;
      const p = labelAt(n, 12), shape = n.kind === 'exit' ? 'M-9 -6 L9 -6 L0 9 Z' : 'M0 -9 L9 6 L-9 6 Z';
      return `<g class="mnode ${n.kind}${n.open || been ? ' open' : ''}${been ? ' been' : ''}${on}${crowded.has(n.id) ? ' crowded' : ''}" data-select="${esc(n.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${n.kind === 'exit' ? 'Exit to' : 'Up to'} floor ${to}"><circle r="18" class="mhit"/><circle r="14" class="exit-glow"/><path d="${shape}" class="exit-mark"/>${pick}<text x="${p.x}" y="${p.y}" class="mlabel" text-anchor="${p.a}">Floor ${to}</text><text x="${p.x}" y="${p.y}" dy="1.45em" class="msub" text-anchor="${p.a}">${band}</text></g>`;
    }
    if (n.kind === 'temp') return tempNodeSvg(s, n, on + (crowded.has(n.id) ? ' crowded' : '') + (s.run?.loc === n.id ? ' here' : ''), (nn, r, name, sub, cls) => (pick || '') + label(nn, r, name, sub, cls));
    if (n.kind === 'transit') return transitSvg(n, s.settings?.motion !== false);
    if (n.kind === 'hidden') {
      const h = n.hidden, flag = hiddenFlagged(s, h);
      return `<g class="mnode hidden f-target${flag ? ' job' : ''}${on}${crowded.has(n.id) ? ' crowded' : ''}" data-select="${h.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Unknown server"><circle r="18" class="mhit"/>${arc(8, h.lead / 100, 'lead')}<text class="qmark" text-anchor="middle" y="4">?</text>${pick}${label(n, 9, flag ? 'Flagged' : h.lead ? `${h.lead}%` : '', flag && h.lead ? `${h.lead}%` : '', 'dim')}</g>`;
    }
    const l = n.loc, st = nodeState(s, l);
    const taken = takenOf(l), total = takeable(l).length;
    const job = openContracts(s).some((c) => c.loc === l.id);
    const progs = programsOn(l).length;
    const rest = st === 'here' ? 'here' : job ? 'contract' : progs ? `${progs} ${progs === 1 ? 'program' : 'programs'}` : l.takenOver ? '' : st === 'done' ? 'clean' : '';
    const op = progs ? ' outpost' : '';
    if (l.rogue) {
      const live = Object.values(l.spawns || {}).filter((x) => x.alive).length;
      return `<g class="mnode rogue${mapTags(s, l, st, job)}${crowded.has(n.id) ? ' crowded' : ''}${st === 'here' ? ' here' : ''}${s.locations.includes(l) && !isLive(s, l) ? ' detached' : ''}${on}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(l.name)}, rogue server"><circle r="18" class="mhit"/><path d="M0 -10 L9 -5 L9 5 L0 10 L-9 5 L-9 -5 Z"/><path d="M-4 -3 L4 3 M4 -3 L-4 3" class="rx"/>${pick}${lvLabel(s, n, 12, l.name, l.level || 1, l.depth || 1, l.occupied ? `rebooting · ${live}` : `${ROGUE.kinds[l.rogue.kind].name.toLowerCase()}${st === 'here' ? ' · here' : live ? ` · ${live} hostile` : ''}`)}</g>`;
    }
    return `<g ${l.faction ? `style="--fc:${FX[l.faction].color}" ` : ''}class="mnode loc ${st}${mapTags(s, l, st, job)}${crowded.has(n.id) ? ' crowded' : ''}${l.faction ? ' fowned' : ''}${l.takenOver ? ' owned' : ''}${s.locations.includes(l) && !isLive(s, l) ? ' detached' : ''}${op}${job ? ' job' : ''}${eventsAt(s, l.id).length ? ' drop' : ''}${on}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(l.name)}"><circle r="18" class="mhit"/>${st === 'new' ? '<circle r="11" class="ring"/>' : arc(10, total ? taken / total : 0, st)}<circle r="5" class="core"/>${rotMark(l)}${l.faction ? `<g class="fmark" transform="translate(9 -17) scale(0.62)">${GLYPHS['f-' + l.faction]}</g>` : ''}${dropMark(s, l)}${serverMarkSvg(s, l.id, thMarks)}${pick}${lvLabel(s, n, 12, l.name, l.takenOver ? null : l.level || 1, l.depth || 1, rest)}</g>`;
  }).join('');
  const hoverNames = s.settings?.mapNames === 'hover';
  const svg = `<svg class="map-svg${hoverNames ? ' names-hover' : ''}${filter.length ? ' mf' + filter.map((k) => ' mf-' + k).join('') : ''}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" data-vb="${minX} ${minY} ${maxX - minX} ${maxY - minY}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${con ? 'Map of your consortium' : `Floor ${fl}, ${esc(floorName(fl))}`}">${scope}${lines}${con ? '' : trafficMarkup(s, nodes)}${con ? '' : trails}${draw}</svg>`;
  // Top corner: which map, and the map's own controls (names on hover, zoom back out).
  const tabs = `<div class="map-tools"><div class="map-left">${consortiumOf(s) ? `<div class="map-tabs comms-filters" role="group" aria-label="Show"><button type="button" data-mapview="mine" aria-pressed="${!con}">Your network</button><button type="button" data-mapview="consortium" aria-pressed="${con}">${esc(consortiumOf(s).name)}</button></div>` : ''}<div class="map-ctl comms-filters map-mode" role="group" aria-label="View"><button type="button" data-maplist="0" aria-pressed="${!list}">Map</button><button type="button" data-maplist="1" aria-pressed="${list}">List</button></div><details class="map-pick${filter.length ? ' on' : ''}"${pickOpen ? ' open' : ''}><summary data-mapfilter-toggle aria-label="Show">${filter.length ? filter.map((k) => MAP_FILTERS.find(([x]) => x === k)[1]).join(' + ') : 'All'}</summary><div class="map-pick-menu">${MAP_FILTERS.map(([k, l]) => `<label><input type="checkbox" data-mapfilter-check="${k}"${filter.includes(k) ? ' checked' : ''}><span>${l}</span></label>`).join('')}${filter.length ? '<button type="button" data-mapfilter-clear>Show all</button>' : ''}</div></details></div><div class="map-ctl comms-filters"><button type="button" data-run="map names ${hoverNames ? 'on' : 'hover'}" aria-pressed="${!hoverNames}" title="${hoverNames ? 'Names show on hover. Click to always show them.' : 'Show names only on hover'}">Aa</button><button type="button" data-locate="__sel" title="Zoom to the selected one">${glyph('trace')}</button><button type="button" data-map-zoom="reset" title="Zoom back out (double-click the map too). Scroll to zoom, drag to pan.">⤢</button></div></div>`;
  // pop: the selected node's card, popped up beside the node (app.js places it once the map is drawn).
  const card = pop ? `<div class="map-pop" id="map-pop" data-keep="${esc(sel || '')}" style="visibility:hidden"><button type="button" class="btn small map-pop-x" data-map-pop-close title="Close">×</button>${mapSide(s, sel, find(sel))}</div>` : '';
  // List mode (MOO2's planets list): every server as a row, sortable, the filters apply; the
  // selected one's card sits beside the list.
  if (list && !con) return `<div class="map-page map-list-page"><section class="panel map-canvas map-list">${tabs}${serverList(s, sel, filter, sort)}</section><aside class="map-side">${mapSide(s, sel, find(sel))}</aside></div>`;
  return `<div class="map-page${side ? '' : ' no-side'}"><section class="panel map-canvas">${tabs}${con ? '' : threatRail(s)}${con ? '' : floorLift(s, fl)}${svg}${card}</section>${side ? `<aside class="map-side">${mapSide(s, sel, find(sel))}</aside>` : ''}</div>`;
}
// The floor panel, a lift's buttons down the side of the map: the floors you've reached lit (the one on the map marked),
// the next one dim with its band, the rest dark. A teal pip on the floor you're connected to.
function floorLift(s, n) {
  const F = floorsOf(s), L = hackerLevel(s), here = s.run ? (s.run.loc === CONFIG.zone.id ? 1 : s.locations.find((l) => l.id === s.run.loc)?.depth || null) : null;
  const rows = FLOORS.map((f, i) => {
    const k = i + 1, [lo, hi] = f.band, open = k <= F.reached, next = k === F.reached + 1;
    const band = open || next ? `<small><b class="${conClass(lo - L)}">${lo}</b>–<b class="${conClass(hi - L)}">${hi}</b></small>` : '';
    return `<button type="button" class="fl-btn ${open ? 'open' : next ? 'next' : 'dark'}${k === n ? ' on' : ''}" ${open ? `data-floor="${k}" title="${esc(`${f.name} · lv ${lo}–${hi}${waypointOf(s, k) ? ` · waypoint ${waypointOf(s, k).name}` : ''}`)}"` : 'disabled'} aria-label="Floor ${k}"><b class="fl-n">${k}</b><span class="fl-name">${open ? esc(f.name) : next ? '???' : ''}</span>${band}${here === k ? '<i class="fl-you" title="You are here"></i>' : ''}</button>`;
  });
  return `<nav class="floor-lift" aria-label="Floors">${rows.join('')}</nav>`;
}
const LIST_COLS = [['name', 'Server'], ['family', 'Family'], ['level', 'Lv'], ['layer', 'Floor'], ['explored', 'Explored'], ['status', 'Status']];
function serverList(s, sel, filter, sort) {
  const [key, dir] = sort.startsWith('-') ? [sort.slice(1), -1] : [sort, 1];
  const rows = (s.locations || []).map((l) => {
    const st = nodeState(s, l), job = openContracts(s).some((c) => c.loc === l.id), tags = mapTags(s, l, st, job);
    const taken = takenOf(l), total = takeable(l).length || 1, progs = programsOn(l);
    const chips = [
      st === 'here' ? '<span class="tag you">here</span>' : '',
      job ? `<span class="ls-job" title="A contract">${glyph('contract')}</span>` : '',
      l.fresh && l.detached ? '<span class="tag">found</span>' : l.detached ? '<span class="tag dim">detached</span>' : '',
      progs.length ? `<span class="tag" title="Programs: ${esc(progs.map((id) => PROGRAMS[id]?.name || id).join(', '))}">${glyph('module')}${progs.length}</span>` : '', l.takenOver ? '<span class="tag dim">yours</span>' : '',
      l.rogue ? `<span class="tag dim">${esc(ROGUE.kinds[l.rogue.kind].name.toLowerCase())}</span>` : '',
    ].join('');
    const rank = tags.includes('f-threat') ? 0 : st === 'here' ? 1 : job || (l.fresh && l.detached) ? 2 : progs.length ? 3 : tags.includes('minor') ? 5 : 4;
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
// Traces in progress: the unknown servers along your floors' links.
function listLeads(s, sel, filter) {
  if (filter.length && !filter.includes('targets')) return '';
  const rows = shownHidden(s).map((n) => ({ id: n.id, name: `? past ${viaName(s, n)}`, fam: n.pinged || n.seen ? n.family : null, pct: n.lead, depth: String(n.depth), flag: hiddenFlagged(s, n) }));
  if (!rows.length) return '';
  return `<h4 class="sl-sec">Unknown servers</h4>${rows.map((r) => `<button type="button" class="sl-row${r.id === sel ? ' on' : ''}" data-select="${esc(r.id)}"><span class="sl-name">${glyph('trace')}<b>${esc(r.name)}</b></span><span class="sl-fam">${r.fam ? glyph(r.fam) + esc(FAMILIES[r.fam]?.name || '') : '?'}</span><span class="sl-lv">—</span><span class="sl-num">${r.depth}</span><span class="sl-exp"><span class="ld-bar"><span style="width:${Math.min(100, r.pct)}%"></span></span><small>${Math.floor(r.pct)}%</small></span><span class="sl-status">${r.flag ? `<span class="ls-job" title="A contract">${glyph('contract')}</span>` : ''}${locBtn(r.id)}</span></button>`).join('')}`;
}
// The map's selection card on its own (the sidebar carries it when it's on).
export function mapSelection(s, sel = 'server', view = 'mine') {
  const con = !!consortiumOf(s) && (view === 'consortium' || sel === 'roamer' || sel.startsWith('member-') || memberServers(s).some((l) => l.id === sel));
  const { nodes } = con ? consortiumLayout(s) : mapLayout(s);
  const node = nodes.find((n) => n.id === sel) || nodes.find((n) => n.id === 'server');
  return mapSide(s, node?.id || 'server', node);
}

// What reaching a server level adds, in words: "a daemon slot"… Your server's level is
// your highest class level, so these come with a level-up (levelup-view.mjs lists them).
export function serverGains(lvl) {
  const out = [];
  if (SERVER.daemonSlotsAt.includes(lvl)) out.push('a daemon slot');
  return out;
}
const andList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0] || '');
// The next server level that adds something, and what.
export function serverNext(lvl) {
  for (let l = lvl + 1; l <= SERVER.maxLevel; l++) { const g = serverGains(l); if (g.length) return `Lv ${l}: ${andList(g)}`; }
  return '';
}

// An event on a server (events.mjs): a mark on the map node, and what's happening on its card.
// Root access (root.mjs): five pips, the perks on hover; and the process a log rotation brought in.
const rootPips = (l) => { const r = rootOf(l), p = rootProgress(l); return `<span class="root-pips" title="${esc(Array.from({ length: ROOT.max }, (_, i) => `${i < r ? '■' : '□'} Root ${i + 1}: ${ROOT_PERKS[i + 1]}`).join('\n') + (p ? `\n\n${p.have}/${p.need} respawned rooms cleared for Root ${r + 1}` : ''))}">${'■'.repeat(r)}<i>${'□'.repeat(ROOT.max - r)}</i></span>`; };
const rotMark = (l) => { const p = procOf(l); return p ? `<g class="rotmark${p.rare ? ' rare' : ''}" transform="translate(-13 -12)"><title>${esc(`${p.rare ? 'Rare virus' : 'Log rotation'}: ${p.name} lv ${p.level} in ${p.room}`)}</title><text>${p.rare ? '★' : '↻'}</text></g>` : ''; };
const hm = (ms) => (ms >= 3600000 ? `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m` : fmtLeft(ms));
const rotLine = (s, l) => {
  if (!rootOf(l) || l.floorplan) return ''; // a server on rooms doesn't rotate: its rooms respawn
  const p = procOf(l), next = l.root?.nextAt, now = Date.now();
  if (p) return `<p class="svc-line"><span class="tag ${p.rare ? 'hot' : 'you'}">${p.rare ? '★' : '↻'} ${esc(p.name)}</span> ${levelTag(s, p.level, `Lv ${p.level}`)} · ${esc(p.room)}${p.until ? ` · ${hm(p.until - now)}` : ''}</p>`;
  return next ? `<p class="svc-line dim" title="Its logs rotate every ${ROOT.rotateMs / 3600000} hours: a fresh virus, and a new cache">↻ ${hm(Math.max(0, next - now))}</p>` : '';
};
const dropMark = (s, l) => { const evs = eventsAt(s, l.id), fd = evs.find((e) => e.card === 'feud'); return evs.length ? `<g class="dropmark" transform="translate(12 -12) scale(1.4)"><path d="M0 4 L0 -3 M-3 -5 Q0 -8 3 -5 M-5 -7 Q0 -12 5 -7"/></g>${fd ? feudMark(fd) : ''}` : ''; };
// A feud's tug-of-war under the antenna: its bar in the two factions' colours.
const feudMark = (ev) => { const [a, b] = ev.sides, w = 18, x = (w * feudShare(ev, a)).toFixed(1); return `<g class="feudmark" transform="translate(3 -33)"><title>${esc(ev.sides.map((f) => `${FX[f].short} ${Math.round(feudShare(ev, f) * 100)}%`).join(', '))}</title><rect width="${x}" height="3" style="fill:${FX[a].color}"/><rect x="${x}" width="${(w - x).toFixed(1)}" height="3" style="fill:${FX[b].color}"/></g>`; };
// An event on this server (events.mjs): its card (event-cards.mjs); a leaked key as a tile until its vault is open.
function dropLine(s, l) {
  if (!l) return '';
  return (leakShown(l) ? leakCard(s, l) : '') + eventsAt(s, l.id).map((ev) => eventCard(s, ev)).join('');
}
const leakShown = (l) => l.leaked && l.passwordKnown && !l.takenOver && !(l.floorplan?.graph.vaults[0] && l.floorplan.opened?.[l.floorplan.graph.vaults[0]]);
// Your server's card: the spotter at your wall and the net-wide cards (an outbreak, a darknet listing), then what a
// killed spotter told you about the next invasion.
function homeEvents(s) {
  return eventsOf(s).filter((ev) => EVENT_CARDS[ev.card].home || (!ev.loc && !ev.hub)).map((ev) => eventCard(s, ev)).join('') + (s.net?.scouted && !s.invasion ? toldCard(s) : '');
}
// A market shock at a hub (events.mjs): ▲ (it pays more: sell) or ▼ (it's cheap: buy), the ware, the minutes left.
function shockTag(s, f) {
  const ev = shockOf(s, f);
  return ev ? `<span class="tag shock ${ev.mult > 1 ? 'up' : 'down'}" title="${esc(`${eventText(s, ev)} ${eventMinutes(ev)} min left.`)}">${ev.mult > 1 ? '▲' : '▼'}${glyph(GLYPH_OF_GOOD[ev.ware])}×${ev.mult}</span>` : '';
}
function shockSvg(s, f) {
  const ev = shockOf(s, f);
  // Sized for the screen, not the map (--z, like the labels): it sits above the hub's mark at any zoom.
  return ev ? `<g class="hub-shock ${ev.mult > 1 ? 'up' : 'down'}" transform="translate(10 -14)"><title>${esc(`${eventText(s, ev)} ${eventMinutes(ev)} min left.`)}</title><g class="hs-in"><rect x="0" y="-15" width="56" height="15" rx="2"/><text x="4" y="-4">${ev.mult > 1 ? '▲' : '▼'}</text><g class="hs-ware" transform="translate(14 -13.5) scale(0.75)">${GLYPHS[GLYPH_OF_GOOD[ev.ware]]}</g><text x="28" y="-4">×${ev.mult}</text></g></g>` : '';
}

// In a consortium, your wall meets invaders while you're logged off: what it stops.
// The wall as a server-card row: a bar of how well it covers the highest level your traced servers
// send (teal: it stops them; amber: they'd be contested; red: they'd break through), and the level it stops.
function wallRow(s, icon, label, b, tipExtra = '') {
  const w = wallSafety(s, b), top = Math.max(w.top, w.at), state = w.state;
  const cover = top ? Math.min(1, b.blocks / top) : 1;
  const tip = `Firewall lv ${b.blocks}: stops invasions up to level ${b.blocks}${b.holds > b.blocks ? `, contests ${b.blocks + 1}–${b.holds}` : ''}. ${safetyTip(s, w, { bands: false })}${tipExtra}`;
  return srvLine(icon, label, `<span class="srv-bar wall ${state}"><span style="width:${(cover * 100).toFixed(0)}%"></span></span>`, state === 'ok' ? '<small>safe</small>' : `<small>vuln lv</small> ${w.vuln}+`, tip);
}
function awayLine(s) {
  if (!consortiumOf(s)) return '';
  if (s.degraded) return srvLine('clock', 'Away', '<span class="tag warn">Rebooting</span>', '', 'No wall until it is back up');
  return wallRow(s, 'clock', 'Away', wallBands(s, wallRating(s)), ` While you're logged off (consortium bonus included); a crash reboots your server for ${CONSORTIUM.rebootMs / 3600000} hours.`);
}

// The consortium (consortium.mjs) on a server card: whose it is, or shared ground.
function consortiumLine(s, l) {
  const c = consortiumOf(s);
  if (!c) return '';
  if (l.trunk) return `<p class="svc-line"><span class="tag tag-con">${esc(c.name)}</span> trunk server: the consortium's own</p>`;
  if (l.member) {
    return `<p class="svc-line"><span class="tag tag-con">${esc(l.member)}'s</span> shared ground</p>`;
  }
  return isGround(s, l) ? `<p class="svc-line"><span class="tag tag-con">${esc(c.name)}</span> shared with the consortium</p>` : '';
}

// The disconnects on a server since your last clean jack out (loc.deaths), each a little more on its reconnect wait
// (combat.mjs relockWait): a small mark beside its Connect.
export const deathMark = (n) => (n > 0 ? `<span class="tag hot death-mark" title="${esc(`+${CONFIG.deathWait.each / 1000} s for each disconnect on this run, up to ${CONFIG.deathWait.cap / 60000} min.`)}">☠ ${n}</span>` : '');
// The rogue server's card: the main thing to do, so it also leads the server card.
function zoneCard(s) {
  const here = s.run?.loc === CONFIG.zone.id, sig = signalNow(s), max = maxSignal(s), need = Math.ceil(max * CONFIG.zone.minSignal);
  const why = active(s) ? 'Finish the fight first' : s.run ? 'Jack out first' : relockLeft(s.zone) ? `Reconnect in ${relockLeft(s.zone)}s` : sig < need ? `Needs ${need} Signal` : '';
  return `<section class="card zone-card"><h2>Rogue server</h2><h1>${CONFIG.zone.name}</h1>
    <div class="stats">${stat('Hostiles', `${liveSpawns(s)}/${zoneRooms().length}`)}${stat('Levels', `<b class="${hackerLevel(s) > CONFIG.zone.maxLevel + 4 ? 'con-gray' : hackerLevel(s) > CONFIG.zone.maxLevel ? 'con-orange' : 'con-yellow'}" title="${hackerLevel(s) > CONFIG.zone.maxLevel ? 'You\'re outgrowing it: its kills pay less every level' : 'Its viruses keep up with you to this level'}">Lv 1–${CONFIG.zone.maxLevel}</b>`)}</div>
    <div class="row">${here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${CONFIG.zone.id}" ${why ? `disabled title="${esc(why)}"` : ''}>Connect</button>`}${why && !here ? `<small class="svc-line">${esc(why)}</small>` : ''}${here ? '' : deathMark(s.zone?.deaths)}</div></section>`;
}
// The server card's lines: icon and name, then what it is (a bar or pips), then its number.
const srvLine = (icon, name, body, value, tip = '') => `<div class="srv-line"${tip ? ` title="${esc(tip)}"` : ''}><span class="srv-k">${glyph(icon)}${esc(name)}</span><span class="srv-v">${body}</span><b class="srv-n">${value}</b></div>`;
// The services, left to right: what runs (icon and version), then what's installing.
// An exit's card (▼): the floor below, its band in WoW colours against your level, its name ??? until you've been. Go
// down once a server it hangs off is located; a floor you've reached is a click away.
// An entry's card (▲, floors 2 and down): this floor and its waypoint (its landing server: Start here connects you
// there from home), then the floor above, Go up.
const bandLine = (s, n) => { const [lo, hi] = bandOf(n), L = hackerLevel(s); return `<b class="${conClass(lo - L)}">Lv ${lo}</b> – <b class="${conClass(hi - L)}">${hi}</b>`; };
function floorCard(s, node) {
  if (node.kind === 'entry') {
    const n = node.floor, wp = waypointOf(s, n), why = active(s) ? 'Finish the fight first' : s.run ? 'Jack out first' : '';
    return `<section class="card floor-card"><h2>Entry · floor ${n}</h2><h1>${esc(floorName(n))}</h1><p class="tagline">${bandLine(s, n)}</p>
      ${wp ? `<div class="fl-row"><span class="fl-k">Waypoint</span><b class="fl-v">${esc(wp.name)}</b><button type="button" class="btn primary small" data-command="connect ${esc(wp.id)}" ${why ? `disabled title="${esc(why)}"` : ''}>Start here</button></div>` : ''}
      <div class="fl-row"><span class="fl-k">▲ Floor ${n - 1}</span><span class="fl-v">${esc(floorName(n - 1))} · ${bandLine(s, n - 1)}</span><button type="button" class="btn small" data-floor="${n - 1}">Go up</button></div></section>`;
  }
  const to = node.to, been = to <= floorsOf(s).reached;
  const go = been ? `<button type="button" class="btn primary" data-floor="${to}">Go down</button>`
    : `<button type="button" class="btn primary" data-command="descend" ${node.open && !active(s) ? '' : `disabled title="${active(s) ? 'Finish the fight first' : 'Locate a server it hangs off'}"`}>Go down</button>`;
  return `<section class="card floor-card"><h2>Exit · floor ${to - 1}</h2><h1>Floor ${to}${been ? ` · ${esc(floorName(to))}` : ''}</h1><p class="tagline">${bandLine(s, to)}</p><div class="row">${go}</div></section>`;
}
function mapSide(s, sel, node) {
  const e = gateOf(s), srv = s.server;
  const busy = active(s) || s.run;
  const alertCard = () => {
    if (!e) return '';
    const v = e.virus, f = FAMILIES[v.family], m = MUTATIONS[v.mutation];
    return `<section class="card alert"><h2>${e.phase === 'active' ? 'Fighting' : 'At the gate'}</h2><h1>${esc(v.name)}${byline(v)}</h1>
      <p class="tagline">${levelTag(s, v.level)} ${esc(f.name)}${m ? ` <span class="tag tag-mut" data-mut="${v.mutation}" title="${esc(m.rule)}">${esc(m.name)}</span>` : ''}${strainTags(s, v)}</p>
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
        ${srvLine('integrity', 'Server', `<span class="tag dim">${esc(ARCHETYPES[serverClass(s)]?.name || '')}</span>`, `<small>Lv</small> ${serverLevel(s)}`, `Your server's level is your highest class level.${serverNext(serverLevel(s)) ? ` ${serverNext(serverLevel(s))}.` : ''}`)}
        ${srvLine('integrity', 'Integrity', `<span class="srv-bar hp ${srv.integrity / srv.max <= 0.3 ? 'low' : srv.integrity / srv.max <= 0.6 ? 'mid' : ''}"><span style="width:${(srv.integrity / srv.max) * 100}%"></span></span>`, `${srv.integrity}<small>/${srv.max}</small>`)}
        ${s.degraded ? srvLine('firewall', 'Firewall', '<span class="tag warn">down</span>', '', 'Your wall is down while the server is degraded') : wallRow(s, 'firewall', 'Firewall', wallBands(s))}
        ${degradedMarkup(s)}${awayLine(s)}
        ${!MEMORY.on ? '' : srvLine('memory', 'Memory', '', `${Math.max(0, memoryCap(s) - liveCount(s))}<small>/${memoryCap(s)} free</small>`, `${liveCount(s)} servers on your network`)}
        ${srvLine('salvage', 'Components', '', `${s.salvage.length}`, 'What broken parts drop. Programs and crafting take them.')}

        ${s.invasion ? `<div class="invader-line ${s.invasion.state}"><b>${esc(s.invasion.name)}</b>${levelTag(s, s.invasion.level)}<span>${esc(invaderShort(s))}</span></div>${s.invasion.state !== 'travel' ? `<div class="row acts">${jackInButton(invaderStatus(s))}</div>` : ''}` : ''}
        ${homeEvents(s)}
        <div class="row acts">${btn('server', 'Server')}${upkeep.join('')}</div>
        ${globalThis.location?.search?.includes('dev') ? `<details><summary>Test intrusions</summary><div class="row" style="margin-top:8px">${btn('encounter cryptjack', 'CRYPTJACK')}${btn('encounter splinter', 'SPLINTER')}${btn('encounter ghostroot', 'GHOSTROOT')}</div></details>` : ''}
      </section>`;
  }
  if (node.kind === 'zone') return zoneCard(s) + alertCard();
  if (node.kind === 'hub') return hubCard(s, node.hub.faction);
  if (node.kind === 'roamer') {
    const r = node.roamer;
    return `<section class="card alert"><h2>Invasion on the trunk line · hop ${r.hop} of ${CONSORTIUM.roam.hops}</h2><h1>${esc(r.name)}</h1>
      <p class="tagline">${levelTag(s, r.level)} ${esc(FAMILIES[r.family].name)} · from ${esc(r.fromName)}</p>
      <div class="stats">${stat('Arrives in', fmtLeft(r.left))}${stat('Bounty', `×${1 + CONSORTIUM.roam.bounty * r.hop}`)}</div>
      <div class="row"><button type="button" class="btn primary" data-command="consortium intercept" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Intercept</button></div></section>`;
  }
  if (node.kind === 'member') {
    const h = node.handle, p = profileOf(h), c = consortiumOf(s), mine = serversOf(s, h);
    return `<section class="card"><h2>Home server · ${esc(c.name)}</h2><h1>${esc(h)}</h1>
      <p>${esc(ARCHETYPES[p.cls].name)} · ${node.online ? '<span class="tag tag-con">online</span>' : '<span class="tag dim">offline</span>'}${c.founder === h ? ' <span class="tag">founder</span>' : ''}</p>
      <div class="stats">${stat('Servers', mine.length)}${stat('Rogue', mine.filter((l) => l.rogue).length)}</div>
      ${mine.map((l) => `<p class="svc-line"><button type="button" class="act" data-select="${esc(l.id)}">${esc(l.name)}</button> ${l.rogue ? 'rogue' : 'traced'} · lv ${l.level}</p>`).join('')}
      ${consortiumOf(s).raid?.member === h ? `<p class="svc-line"><span class="tag hot">Invasion</span> ${esc(consortiumOf(s).raid.name)} lv ${consortiumOf(s).raid.level} at their wall · ${fmtLeft(consortiumOf(s).raid.left)}</p><div class="row"><button type="button" class="btn primary" data-command="consortium defend ${esc(h)}" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Defend their wall</button></div>` : ''}
      ${rebooting(s, h) ? '<p class="svc-line"><span class="tag warn" title="Crashed: their server is on the map below them, open to clear.">Crashed</span></p>' : ''}</section>${networkCardMarkup(s, h)}`;
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
  if (node.kind === 'hidden') {
    const h = node.hidden, via = s.locations.find((x) => x.id === h.via), flag = hiddenFlagged(s, h), kit = kitOf(s);
    const job = openContracts(s).find((c) => c.hidden === h.id && !c.loc);
    return `<section class="card${flag ? ' alert' : ''}"><h2>Unknown server · floor ${h.depth}</h2><h1>?</h1>
      <p class="svc-line">Past ${esc(viaName(s, h))} · Signal <span class="sigbars">${'▮'.repeat(h.signal)}${'▯'.repeat(5 - h.signal)}</span></p>
      <p class="svc-line">${h.pinged || h.seen ? `<span class="tag fam-tag" title="Its virus family. Kills of this family trace it once a relay pings it.">${glyph(FAM_GLYPH[h.family] || 'kill')}${esc(FAMILIES[h.family]?.name || h.family)}</span>` : `<span class="tag dim" title="A relay on ${esc(via?.name || 'the server next to it')} reveals its family. So does an invader it sends.">${glyph('kill')}Family unknown</span>`}</p>
      ${flag && job ? `<p class="svc-line"><span class="tag">Contract</span> ${esc(contractTitle(s, job))}</p>` : ''}
      <div class="lvl-row"><span class="lvl-bar"><span style="width:${h.lead}%"></span></span><small>${h.lead}% traced</small></div>
      ${traceWays(s, h, via, kit)}
      ${kit.injector ? `<div class="row"><button type="button" class="btn" data-command="use injector ${h.id}">${glyph('injector')}Trace injector · ${kit.injector}</button></div>` : ''}</section>`;
  }
  if (node.kind === 'exit' || node.kind === 'entry') return floorCard(s, node);
  if (node.kind === 'temp') return tempCard(s, node.loc, { here: s.run?.loc === node.loc.id, busy, relock: relockLeft(node.loc), btn }); // a thread's temporary server (threads-view.mjs)
  const l = node.loc, st = nodeState(s, l);
  // A server you found but never connected: Connect asks first, showing the memory it takes.
  if (l.fresh && l.detached && s.locations.includes(l)) {
    const j = joinCost(s, l), asking = memAsk === l.id, after = j.used + j.add;
    const pips = memPips(j);
    const why = busy ? 'Finish what you are doing first' : relockLeft(l) ? 'Still tracing your last connection' : !j.fits ? 'Not enough memory. Detach another server first.' : '';
    return `<section class="card mem-card${asking ? ' asking' : ''}"><h2>Floor ${l.depth || 1} · found</h2><h1>${esc(l.name)}</h1>
      <p class="tagline">${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)}${l.faction ? ` · <span class="tag" style="--fc:${FX[l.faction].color}">${esc(FX[l.faction].short)}</span>` : ''}${l.rogue ? ' · <span class="tag hot">rogue</span>' : ''}</p>
      <div class="srv-slots">${pips}</div>
      ${asking
        ? `<div class="mem-ask"><div class="row"><button type="button" class="btn primary" data-mem-yes="${esc(l.id)}" ${why ? `disabled title="${esc(why)}"` : `title="Joins your network: uses ${j.add} memory"`}>${glyph('memory')}Connect · +${j.add}</button><button type="button" class="btn" data-mem-no>Cancel</button></div></div>`
        : `<div class="row"><button type="button" class="btn primary" data-mem-ask="${esc(l.id)}" ${why && why !== 'Not enough memory. Detach another server first.' ? `disabled title="${esc(why)}"` : `title="Uses ${j.add} memory"`}>Connect</button></div>`}</section>`;
  }
  // Memory (memory.mjs): a detached server is frozen; its card is just that and Attach.
  if (s.locations.includes(l) && !isLive(s, l)) {
    const up = l.detached ? null : (() => { let p = l; while (p && !p.detached) p = s.locations.find((x) => x.id === p.parent); return p; })();
    return `<section class="card mem-card"><h2>Floor ${l.depth || 1} · detached</h2><h1>${esc(l.name)}</h1>
      <p class="tagline">${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)}${programsOn(l).length ? ` · ${glyph('module')}programs frozen` : ''}</p>
      <div class="srv-slots">${memPips(joinCost(s, l))}</div>
      <div class="row">${up ? `<button type="button" class="btn" data-select="${esc(up.id)}">${esc(up.name)} is detached</button>` : `<button type="button" class="btn primary" data-command="attach ${esc(l.id)}" ${busy || s.server.credits < memoryCost(l) || !joinCost(s, l).fits ? 'disabled' : ''} title="${!joinCost(s, l).fits ? 'Not enough free memory. Detach another server first.' : 'Back on your network, as it was'}">${glyph('credits')}Attach · ${memoryCost(l)}</button>`}</div></section>`;
  }
  if (l.occupied) {
    const live = Object.values(rogueSpawns(s, l)).filter((x) => x.alive).length;
    return `<section class="card alert"><h2>${l.member ? `${esc(l.member)}'s server` : 'Your server'} · rebooting</h2><h1>${esc(l.name)}</h1>
      <p class="tagline">${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)} · occupied</p>
      <div class="stats">${stat('Viruses', `${live}/${rogueRooms(l).length}`)}${stat('Back up in', fmtTime(l.member ? l.occupied.left : degradedLeft(s)))}</div>
      <p class="svc-line"><span class="tag warn" title="Clear every folder to bring it back up${l.member ? ' (a bounty)' : ''}">Crashed</span></p>
      <div class="row">${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relockLeft(l) ? 'disabled title="Still tracing your last connection"' : ''}>Connect</button>`}</div></section>`;
  }
  if (l.rogue) {
    const k = ROGUE.kinds[l.rogue.kind], live = Object.values(rogueSpawns(s, l)).filter((x) => x.alive).length;
    return `<section class="card"><h2>${l.trunk ? 'Trunk server' : l.member ? `${esc(l.member)}'s rogue server` : 'Rogue server'}${` · floor ${l.depth || 1}`}</h2><h1>${esc(l.name)}</h1>
      <p class="tagline">${levelTag(s, (l.level || 1) + (l.rogue.kind === 'pit' ? ROGUE.pitLevels : 0))} <span class="tag tag-rogue" title="${esc(k.rule)}">${esc(k.name)}</span>${l.rogue.kind === 'nest' ? ` ${esc(FAMILIES[l.family].name)}` : ''}</p>
      <div class="stats">${stat('Hostile', `${live}/${rogueRooms(l).length}`)}${stat('Runs', l.runs || 0)}</div>
      <p class="svc-line"><span class="tag dim" title="Can't be taken over; never sends invasions">wild</span></p>
      ${consortiumLine(s, l)}
      <div class="row">${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relockLeft(l) ? `disabled title="${l.rogueRun?.rebootAt > rogueClock() ? 'Rebooting: every room comes back fresh' : 'Still tracing your last connection'}"` : ''}>Connect</button><button type="button" class="btn hot-btn" data-command="connect ${esc(l.id)} loud" ${busy || relockLeft(l) ? 'disabled' : ''} title="${esc(LOUD_TIP)}"><span class="loud-ico" aria-hidden="true"></span>Go loud</button>`}${!l.member && !l.trunk && s.locations.includes(l) && MEMORY.on && !freeOfMemory(l) ? `<button type="button" class="btn small mem-x" data-command="detach ${esc(l.id)}" data-confirm="Click again to detach" ${busy ? 'disabled' : ''} title="Free a memory slot. Frozen until you attach it again.">${glyph('memory')}Detach · ${memoryCost(l)}</button>` : ''}${st !== 'here' && relockLeft(l) ? `<small class="svc-line">${l.rogueRun?.rebootAt > rogueClock() ? 'Rebooting: back' : 'Reconnect'} in ${relockLeft(l)}s</small>` : ''}${st !== 'here' ? deathMark(l.deaths) : ''}</div></section>`;
  }
  const layout = layoutName(l);
  const guard = Object.keys(l.state.cleared).length ? 'guard beaten' : 'guarded';
  const taken = takenOf(l), total = takeable(l).length;
  // On rooms (R1, netrooms.mjs): its rooms cleared, Mapped, and the vault; ??? until you've been in.
  const R = l.floorplan, vaultId = R?.graph.vaults[0];
  const roomsStat = R ? stat('Rooms', `${taken}/${total}${R.mapped ? ' ✓' : ''}`) : stat('Rooms', '???');
  const vaultStat = l.takenOver ? stat('Root', rootPips(l)) : stat('Vault', R && vaultId && R.opened[vaultId] ? 'open' : R ? 'shut' : '???');
  const parent = l.parent && s.locations.find((x) => x.id === l.parent);
  return `<section class="card ${st === 'new' ? 'alert' : ''}"><h2>${l.member ? `${esc(l.member)}'s server` : `Floor ${l.depth || 1}`} · ${esc(FAMILIES[l.family].name)}</h2><h1>${esc(l.name)}</h1>
    <p class="tagline">${levelTag(s, l.level || 1)} <span class="tag tag-kind" data-kind="${esc(l.template || '')}"${layoutRule(l) ? ` title="${esc(layoutRule(l))}"` : ''}>${esc(layout)}</span>${siteLabel(l) ? ` <span class="tag tag-site" title="${esc(siteLabel(l).rule)}">${esc(siteLabel(l).name)}</span>` : ''}${QUIRKS[l.quirk] ? ` <span class="tag tag-quirk" data-quirk="${l.quirk}" title="${esc(QUIRKS[l.quirk].rule)}">${esc(QUIRKS[l.quirk].name)}</span>` : ''}</p>
    <div class="stats">${roomsStat}${vaultStat}${stat('Runs', l.runs || 0)}</div>
    ${R?.mapped || (R && l.takenOver) ? `<p class="svc-line">${R.mapped ? '<span class="tag you" title="Every room cleared at least once">Mapped</span> ' : ''}<span class="tag" title="Mapped or held, a server's rooms come back fast">Fast respawns</span> <small>fight rooms ${ROOMS_FP.respawn.process} min, guard posts ${ROOMS_FP.respawn.guard}, elites ${ROOMS_FP.respawn.elite}</small></p>` : ''}
    ${openContracts(s).filter((c) => c.loc === l.id).map((c) => `<p class="svc-line"><span class="tag${c.offBooks ? ' hot' : ''}">Contract</span> ${esc(contractTitle(s, c))} <small class="svc-prog">· ${esc(contractProgress(s, c).text)}</small></p>`).join('')}
    ${parent ? `<p class="svc-line">via ${esc(parent.name)}</p>` : ''}
    ${l.passwordKnown && !leakShown(l) ? `<p class="svc-line">key <code>${esc(l.password)}</code></p>` : ''}
    ${l.relay ? '<p class="svc-line"><span class="tag you">Relay up</span></p>' : ''}
    ${rotLine(s, l)}
    ${rareLine(s, l)}
    ${consortiumLine(s, l)}
    ${l.faction ? `<p class="svc-line fline" style="--fc:${FX[l.faction].color}">${fIcon(l.faction)}<b>${esc(FX[l.faction].short)}</b> runs it · beating its Resident takes it: ${esc(FX[l.faction].short)} −${OWNED.takeoverHit}${FX[l.faction].rivals.length ? `, ${FX[l.faction].rivals.map((r) => esc(FX[r].short)).join(' and ')} +${Math.round(OWNED.takeoverHit * 0.5)}` : ''}</p>` : ''}
    ${dropLine(s, l)}
    ${programsLine(s, l)}
    ${l.takenOver && !l.relay && !kitOf(s).relay ? `<p class="op-hint">${boardOpen(s) ? knowsRelay(s) ? 'You can install a relay here once you have one. Craft one on the Craft page, or buy one in Halcyon\'s store.' : 'You can install a relay here once you have one. Buy one in Halcyon\'s store, or earn one from a contract. Some contracts pay the Relay plan, so you can craft your own.' : 'You can install a relay here once you have one. Halcyon Mutual sells them once you start working for them.'}</p>` : ''}
    <div class="row">${l.takenOver && !l.relay ? `<button type="button" class="btn" data-command="relay ${esc(l.id)}" ${kitOf(s).relay ? '' : 'disabled title="You have no relay yet."'}>Install relay${kitOf(s).relay ? ` (${kitOf(s).relay})` : ''}</button>` : ''}${!l.takenOver && !l.member && !l.passwordKnown && kitOf(s).cracker ? `<button type="button" class="btn" data-command="use cracker ${esc(l.id)}">Key cracker (${kitOf(s).cracker})</button>` : ''}${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn ${st !== 'done' ? 'primary' : ''}" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relockLeft(l) ? 'disabled title="Still tracing your last connection"' : ''}>${relockLeft(l) ? `Connect · ${relockLeft(l)}s` : 'Connect'}</button>${st !== 'done' ? `<button type="button" class="btn hot-btn" data-command="connect ${esc(l.id)} loud" ${busy || relockLeft(l) ? 'disabled' : ''} title="${esc(LOUD_TIP)}"><span class="loud-ico" aria-hidden="true"></span>Go loud</button>` : ''}`}${!l.member && !l.trunk && s.locations.includes(l) && MEMORY.on && !freeOfMemory(l) ? `<button type="button" class="btn small mem-x" data-command="detach ${esc(l.id)}" data-confirm="Click again to detach" ${busy ? 'disabled' : ''} title="Free a memory slot. Frozen until you attach it again.">${glyph('memory')}Detach · ${memoryCost(l)}</button>` : ''}${st !== 'here' ? deathMark(l.deaths) : ''}</div></section>`;
}

// The Antenna (a Lantern Route piece, sets.mjs): a server's ★ rare spawn on its map card, the room it waits in.
export function rareLine(s, l) {
  const R = l.floorplan, rooms = R?.rare && seesRare(s) ? Object.keys(R.rare).filter((id) => R.rare[id] && R.graph?.rooms?.[id]) : [];
  return rooms.length ? `<p class="svc-line"><span class="tag" title="The Antenna shows it: a rare spawn waits there until you kill it">★ Rare spawn</span> <small>${rooms.map((id) => esc(R.graph.rooms[id].path || R.graph.rooms[id].label || id)).join(', ')}</small></p>` : '';
}
// A server's programs (sockets.mjs) on its map card: each by name, its rule on hover, and its socket rooms.
function programsLine(s, l) {
  const R = l.floorplan;
  if (!R || R.type !== 'server') return '';
  const rooms = Object.values(R.graph.rooms), sockets = rooms.filter((x) => x.kind === 'socket'), open = sockets.filter((x) => x.open || R.cleared[x.id]).length + (l.takenOver ? 1 : 0);
  const progs = Object.entries(R.programs || {});
  const chips = progs.map(([id, p]) => `<span class="mod on" title="${esc(`${PROGRAMS[p]?.rule || ''}\nIn ${R.graph.rooms[id]?.path || 'a socket'}.`)}">${glyph('module')}${esc(PROGRAMS[p]?.name || p)}</span>`).join('');
  return `<div class="op-row prog-row"><span class="op-label" title="Socket rooms you've cleared${l.takenOver ? ', and its Core' : ''}, of all its sockets">${glyph('module')}Sockets ${open}/${sockets.length + (l.takenOver ? 1 : 0)}</span><div class="op-val"><div class="mods">${chips || '<small class="quiet">no programs</small>'}</div></div></div>`;
}

// A traced server's type as the card names it, and its one rule on rooms (floorplan.mjs KINDS) for the tag's tooltip.
// (A relay is the item you install on a server you hold: the relay template reads as a name server.)
export const LAYOUT_NAMES = { relay: 'Name server', mailhub: 'Mail hub', mirror: 'Public mirror', archive: 'Backup archive', lab: 'Research lab' };
export const layoutName = (l) => LAYOUT_NAMES[l.template] || 'Node';
export const layoutRule = (l) => kindRule(KIND_OF[l.template]);

// Free memory: the pips you have, and the one(s) a server would take (blinking): "4 → 3/4 free".
function memPips(j) {
  const free = Math.max(0, j.cap - j.used), left = j.cap - j.used - j.add;
  return `<span class="slots mem-join${j.fits ? '' : ' over'}" title="Free memory: ${free}/${j.cap} → ${Math.max(0, left)}/${j.cap}">${glyph('memory')}${Array.from({ length: j.cap }, (_, i) => `<i class="${i < Math.max(0, left) ? 'on' : i < free ? 'take' : ''}"></i>`).join('')}<small>${free}<span class="mj-to">→</span><b>${left}</b>/${j.cap} free</small></span>`;
}
// Volume sliders: music, ambience (radio, rain, the street, the room tone), places (each floor's and hub's loop, a
// virus family's idle in a fight: places.mjs), effects.
export const volumesOf = (s) => ({ music: 0.8, ambience: 0.8, places: 0.8, sfx: 0.8, ...(s.settings?.volume || {}) });
function volumeCard(s) {
  const v = volumesOf(s);
  const row = (id, label, title) => `<label class="vol-row" title="${esc(title)}"><span class="vol-name">${label}</span><input type="range" min="0" max="100" step="1" value="${Math.round(v[id] * 100)}" data-volume="${id}" aria-label="${label} volume"><b class="vol-val" data-volume-val="${id}">${Math.round(v[id] * 100)}</b></label>`;
  return `<section class="card vol-card"><h2>Sound</h2>${s.settings.sound ? '' : '<p class="svc-line">Sound is off.</p>'}
    ${row('music', 'Music', 'The soundtrack')}${row('ambience', 'Ambience', 'Radio chatter, rain, thunder, the street and the room tone')}${row('places', 'Places', 'Each floor\'s and hub\'s own sound, and a virus family\'s hum under a fight. 0 turns them off')}${row('sfx', 'Effects', 'Hits, keys, alerts and everything else the game plays')}</section>`;
}

function paceCard(s) {
  const p = paceOf(s);
  const line = p.perHour == null ? `Not enough play yet: ${p.kills} ${p.kills === 1 ? 'kill' : 'kills'} in ${Math.round(p.minutes)} min.` : `<b>${p.perHour}</b> kills an hour (${p.kills} in ${p.minutes >= 90 ? (p.minutes / 60).toFixed(1) + ' h' : Math.round(p.minutes) + ' min'} of play).`;
  return `<section class="card"><h2>Pace</h2><p class="svc-line" title="Counts time while the game is open and you've used it in the last 2 minutes. Loot targets assume ${LOOT.killsPerHour} kills an hour.">${line}</p></section>`;
}

// The System page's tabs: Settings (everything as it was), Achievements (achievements-view.mjs), Casing
// (casing-view.mjs: the monitor's colourway, plate and stickers) and Terminal (terminal-view.mjs: the boot, the
// prompt and the cursor).
export const SYSTEM_TABS = [['settings', 'Settings'], ['achievements', 'Achievements'], ['casing', 'Casing'], ['terminal', 'Terminal']];
const systemTabs = (s, tab) => `<nav class="ltabs sys-tabs" role="tablist" aria-label="System">${SYSTEM_TABS.map(([k, l]) => `<button type="button" role="tab" data-stab="${k}" aria-selected="${tab === k}">${esc(l)}${k === 'achievements' ? `<small class="sys-pts">${glyph('medal')}${pointsOf(s)}</small>` : ''}</button>`).join('')}</nav>`;
export function systemMarkup(s, { coop = false, tab = 'settings', ach = {}, cs = {} } = {}) {
  if (tab === 'achievements') return systemTabs(s, tab) + achievementsMarkup(s, ach);
  if (tab === 'casing') return systemTabs(s, tab) + casingPageMarkup(s, cs);
  if (tab === 'terminal') return systemTabs(s, tab) + terminalPageMarkup(s);
  // Co-op (coop-ui.mjs, docs/coop.md): a developer prototype, so only with ?dev.
  const co = coop ? '<section class="card coop-card"><h2>Co-op</h2><p>Play a run with another player. Your game runs the world, theirs sends their character. Prototype.</p><div class="row"><button type="button" class="btn" data-run="coop">Open Co-op</button></div></section>' : '';
  return `${systemTabs(s, tab)}<div class="page-grid"><div style="display:grid;gap:12px">${co}${volumeCard(s)}${paceCard(s)}
    <section class="card settings-card"><h2>Settings</h2><div class="row settings-grid">
      <button type="button" class="btn" data-toggle="speed">Speed: ${esc(s.settings.speed || 'normal')} (${cycleLength(s) / 1000}s per cycle)</button>
      <button type="button" class="btn" data-toggle="sound" aria-pressed="${!!s.settings.sound}">Sound ${s.settings.sound ? 'on' : 'off'}</button>
      <button type="button" class="btn" data-toggle="motion" aria-pressed="${!!s.settings.motion}">Motion ${s.settings.motion ? 'on' : 'off'}</button>
      <button type="button" class="btn" data-run="music ${s.settings.music === false ? 'on' : 'off'}" aria-pressed="${s.settings.music !== false}" ${s.settings.sound ? '' : 'disabled'} title="Music from the music folder, one track for home, runs and fights">Music ${s.settings.music === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="radio ${s.settings.radio === false ? 'on' : 'off'}" aria-pressed="${s.settings.radio !== false}" ${s.settings.sound ? '' : 'disabled'} title="Stray transmissions in the static">Radio ${s.settings.radio === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="radio test" ${s.settings.sound ? '' : 'disabled'}>Test radio</button>
      <button type="button" class="btn" data-toggle="haptics" aria-pressed="${!!s.settings.haptics}" title="Vibration works on Android phones">Vibrate ${s.settings.haptics ? 'on' : 'off'}</button>
      <button type="button" class="btn" data-run="shell toggle" aria-pressed="${s.settings.shell !== 'plain'}" title="CRT screen, boot sequence, status line, glitches when you're hit">Shell: ${s.settings.shell === 'plain' ? 'plain' : 'immersive'}</button>
      <button type="button" class="btn" data-run="shell boot" ${s.settings.shell === 'plain' ? 'disabled' : ''}>Reboot screen</button>
      <button type="button" class="btn" data-run="casing ${s.settings.casing === false ? 'on' : 'off'}" aria-pressed="${s.settings.casing !== false}" ${s.settings.shell === 'plain' ? 'disabled' : ''} title="The monitor around the screen, on wide screens">Casing ${s.settings.casing === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="window ${s.settings.window === false ? 'on' : 'off'}" aria-pressed="${s.settings.window !== false}" ${s.settings.shell === 'plain' || s.settings.casing === false ? 'disabled' : ''} title="The city outside, beside the monitor">Window ${s.settings.window === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="screen fx next" title="Light around the game (the backdrop, the screen's edges, the casing's lamps) and how much moves in a fight. Off: numbers and bars only. Subtle and medium: the number, the bar and who did it. Bold: impact bursts, sparks and flashes too">Screen effects: ${esc(sfxLevel(s))}</button>
      ${Object.entries(SFX.effects).map(([id, name]) => `<button type="button" class="btn" data-run="screen fx ${id} ${!s.settings.screenFxOff?.[id] ? 'off' : 'on'}" aria-pressed="${!s.settings.screenFxOff?.[id]}" ${s.settings.shell === 'plain' || sfxLevel(s) === 'off' ? 'disabled' : ''}>${name} ${!s.settings.screenFxOff?.[id] ? 'on' : 'off'}</button>`).join('')}
      <button type="button" class="btn" data-run="tips ${s.settings.tips === false ? 'on' : 'off'}" aria-pressed="${s.settings.tips !== false}">Tips ${s.settings.tips === false ? 'off' : 'on'}</button>
      <button type="button" class="btn" data-run="tips replay">Replay tips</button>
      <button type="button" class="btn" data-run="channel ${s.settings.channel === false ? 'on' : 'off'}" aria-pressed="${s.settings.channel !== false}" title="#net's latest line over the prompt">#net ${s.settings.channel === false ? 'muted' : 'on'}</button>
    </div>
    <div class="row sound-test"><span class="next-label">Sound test</span>${[['hit', 'Hit'], ['break', 'Break'], ['hurt', 'Hurt'], ['unlock', 'Unlock'], ['pickup', 'Pickup'], ['good', 'Good news'], ['win', 'Win / level'], ['chit', 'Armor ◆'], ['patch', 'Patch'], ['interrupt', 'Interrupt'], ['nope', 'Refused'], ['prewarn', 'Warning'], ['daemon', 'Daemon'], ['channel', 'Channel change'], ['jackin', 'Connect'], ['hangup', 'Hang up'], ['lose', 'Crash'], ['mark', 'Mark'], ['burn', 'Burn'], ['helper', 'Helper'], ['shield', 'Shield'], ['buff', 'Buff']].map(([id, name]) => `<button type="button" class="btn" data-sound="${id}">${name}</button>`).join('')}</div></section>
    ${collectionMarkup(s)}
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
  if (loot.length) add('Components', String(loot.length), 'loot', { text: `${loot.length} components`, sub: [...new Set(loot.map((e) => String(e.message || '').replace(/ recovered\.$/, '')))].filter(Boolean).join(', ') });
  const xp = events.filter((e) => e.type === 'xp').reduce((n, e) => n + e.amount, 0);
  if (xp) add('XP', `+${xp}`, 'xp', { text: `+${xp} XP` });
  for (const e of events) {
    if (e.type === 'fast-kill') add('Fast kill', `+${e.amount} XP`, 'fast', { text: `Fast kill +${e.amount} XP`, sub: `${e.cycles} cycles` });
    else if (e.type === 'hot-kill') add('Hot strain', `+${e.amount} XP`, 'fast', { text: `Hot strain +${e.amount} XP` });
    else if (e.type === 'xp' && / decoded$/.test(e.message?.split(' · ')[1]?.replace(/\.$/, '') || '')) add(`Decoded: ${e.message.split(' · ')[1].replace(/ decoded\.?$/, '')}`, `+${e.amount} XP`, 'fast', { text: `${e.message.split(' · ')[1]} +${e.amount} XP` });
    else if (e.type === 'rested') add('Rested', `+${e.amount} XP`, 'fast', { text: `Rested +${e.amount} XP` });
    else if (e.type === 'set-xp') { const who = String(e.message || '').split(':')[0].replace(/ \(\d\)$/, ''); add(who, `+${e.amount} XP`, 'fast', { text: `${who} +${e.amount} XP`, sub: 'the kill after a delivery' }); } // a set bonus (sets.mjs)
    else if (e.type === 'fresh') add(`Fresh: ${XP_KINDS[e.kind] || ''}`, `+${e.amount} XP`, 'fast', { text: `Fresh ${XP_KINDS[e.kind] || ''} +${e.amount} XP` });
    else if (e.type === 'level-up') add(`Level ${e.level}`, '', 'level', { sub: e.unlocked?.length ? 'New skill unlocked' : 'Power +4%' });
    else if (e.type === 'server-level') add(`Server level ${e.level}`, '', 'level');
    else if (e.type === 'code' && e.gains) for (const [m, n] of Object.entries(e.gains)) add(MATERIALS[m]?.name || m, `+${n}`, m === 'exploit' ? 'exploit' : 'code', { pack: !!e.pack, text: `+${n} ${MATERIALS[m]?.name || m}` });
    else if (e.type === 'drop' && e.daemon && DAEMONS[e.daemon]) {
      // A daemon from an invasion: its name and level, and its line (or that it scrapped for code, a row of its own).
      if (!e.scrap) add(`${DAEMONS[e.daemon].name} lv ${e.level}`, '', 'daemon', { sub: daemonText(e.daemon, e.level), text: `Daemon: ${DAEMONS[e.daemon].name} lv ${e.level}` });
    } else if (e.type === 'drop') {
      const what = e.item ? itemLabel(e.item) : e.recipe || /blueprint/i.test(e.message || '') ? 'Blueprint' : 'Drop';
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
  score: '<rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path d="M5 8.2l2 2 4-4.4"/>', // a puzzle room's board, how it went
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
// lead: a block over the rows (the Disconnected card's death recap, recap.mjs), as markup.
export function gainMarkup(kicker, name, rows, go = true, lead = '') {
  return `<div class="sp-card gain-card" role="status" aria-label="${esc(kicker)}: ${esc(rows.map((r) => r.text).join(', ') || 'nothing')}">
    <i class="sp-corner tl"></i><i class="sp-corner tr"></i><i class="sp-corner bl"></i><i class="sp-corner br"></i>
    <header class="sp-head"><span class="sp-kicker">${esc(kicker)}</span>${name ? `<strong class="sp-name">${esc(name)}</strong>` : ''}</header>
    ${lead}
    <ul class="sp-rows">${rows.length ? rows.map((r, i) => spRow(r, i)).join('') : '<li class="sp-row k-none" style="--i:0"><span class="sp-lbl">—</span></li>'}</ul>
    ${go ? `<button type="button" class="sp-go" data-gain-go style="--i:${rows.length + 1}">Continue <kbd>Enter</kbd></button>` : ''}</div>`;
}

// Components as stacks: the ones a recipe asks for by name marked.
export function salvageStacksMarkup(s) {
  const st = salvageStacks(s);
  if (!st.length) return '';
  return `<h3 class="sv-head">${glyph('salvage')}Components</h3><ul class="sv-rows">${st.map((x) => `<li class="${x.component ? 'comp' : ''}" title="${esc(x.component ? `${x.name}: pays any cost, and some recipes ask for it by name.` : `${x.name}: pays any cost.`)}"><span class="sv-name">${esc(x.name)}</span>${x.component ? '<span class="tag sv-tag">named</span>' : '<span></span>'}<b>${x.n}</b></li>`).join('')}</ul>`;
}

// The payment picker: which salvage pays for this. key: a SALVAGE_COSTS key with an optional
// ':n' (the generic amount). pay: { name: n } chosen so far.
// A pay picker's cost, by its key: a recipe's (protocol:8, zeroday:6, filter, relay) or a program's in the socket you
// stand in (program:harvester, sockets.mjs).
export function payCost(s, key) {
  const [id, n] = key.split(':');
  if (id === 'program') { const c = programCost(s.rooms, n); return { any: c.any, need: c.need }; }
  return SALVAGE_COSTS[id](Number(n) || 0);
}
export function payMarkup(s, key, pay, title) {
  const cost = payCost(s, key);
  const st = salvageStacks(s);
  const used = Object.values(pay).reduce((a, b) => a + b, 0), need = salvageTotal(cost);
  const problem = payProblem(s, cost, pay);
  const reqs = cost.need.map((x) => { const got = x.names.reduce((a, nm) => a + (pay[nm] || 0), 0); return `<span class="pay-req ${got >= x.n ? 'ok' : ''}">${esc(x.label)} <b>${Math.min(got, x.n)}/${x.n}</b></span>`; });
  const wanted = new Set(cost.need.flatMap((x) => x.names));
  return `<div class="pay-card" role="dialog" aria-label="Pay components for ${esc(title)}">
    <header><span class="sp-kicker">Pay components</span><strong>${esc(title)}</strong><small>${esc(salvageLabel(cost))}</small></header>
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
  daemons: (s) => Object.entries(s.daemonLv || {}).map(([id, v]) => `${id}:${v}`),
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
        return `<div class="pmate${up ? '' : ' down'}${m.who === actedWho ? ' acting' : ''}" data-mate="${esc(m.who)}"><b>${esc(m.who)}</b><small class="pm-cls">${esc(ARCHETYPES[m.loadout.archetype].name)} <span class="pm-lv">Lv ${hackerLevel(m)}</span></small>${live && up && drawingFire(m) ? '<span class="tag hot pm-tag">drawing fire</span>' : ''}${live && up ? raidMarks(s, m).filter((x) => x.name !== 'Aggro' || !drawingFire(m)).map((x) => `<span class="tag ${x.kind} pm-tag" title="${esc(x.tip)}">${esc(x.name)}</span>`).join('') : ''}<span class="pbar"><span style="width:${pct}%"></span>${fc ? lossMark(m.run.integrity, m.run.max, fc.mates[m.who] || 0) : ''}</span><small>${up ? `${sig}/${m.run.max}` : 'down'}</small>${intent}${!inFight ? runMate(s, m.who) : ''}</div>`;
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
    ctx = al.length ? `<section class="sb-block sb-alerts"><div class="sb-head"><b>Needs you</b><small>${al.length}</small></div><ul>${al.map((c) => `<li><button type="button" class="act" data-go="${esc(c.go)}" data-cid="${c.id}" title="${esc(c.text)}"><span class="k ${c.kind}">${c.card && EVENT_ICON[c.card] ? glyph(EVENT_ICON[c.card]) : ''}${esc(c.label)}${chainMk(c)}</span>${esc(c.text.length > 60 ? c.text.slice(0, 58) + '…' : c.text)}</button></li>`).join('')}</ul></section>` : '';
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
    <p class="svc-line">${esc(h.name)} · lv ${h.level}</p>${repBar(s, f)}${relations(f)}${shockOf(s, f) ? eventCard(s, shockOf(s, f)) : ''}
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
  const pst = pieceState(s, f), piece = pst && (pst.parts || pst.held || pst.found) ? [{ key: 'piece', label: 'Assemble', meta: partPips(pst, pst.ready ? 'ready' : '') }] : []; // its faction piece (faction-gear.mjs), once you hold a part or the piece: the parts are yours, whatever your rep
  if (captured(s, f)) return [{ key: 'hold', label: 'Your hub', meta: `${glyph('credits')}${bankOf(s, f)}` }, { key: 'market', label: 'Market', meta: `⇄ ${Math.round(travelMs(s, f) / 60000)}m` }, { key: 'shop', label: 'Shop', meta: 'at cost' }, ...piece];
  if (hostile(s, f)) return [...(PAYLOAD.on ? [pay] : []), ...(f !== 'halcyon' ? [{ key: 'donate', label: 'Donate', meta: donationOf(s, f).x > 1 ? `×${donationOf(s, f).x.toFixed(1)}` : '' }] : []), ...piece, servers];
  if (offline(s, f, now)) return [...(PAYLOAD.on ? [pay] : []), servers];
  return [
    { key: 'market', label: 'Market', meta: `⇄ ${Math.round(travelMs(s, f) / 60000)}m` },
    { key: 'shop', label: 'Shop', meta: f === 'halcyon' ? 'instant' : `${shopOf(s, f, now).filter((g) => !g.locked && g.left).length}` },
    { key: 'work', label: 'Work', meta: `${offers}` },
    ...(PAYLOAD.on ? [pay] : []),
    ...(f !== 'halcyon' && donationOf(s, f).open ? [{ key: 'donate', label: 'Donate', meta: donationOf(s, f).x > 1 ? `×${donationOf(s, f).x.toFixed(1)}` : '' }] : []),
    ...piece,
    servers,
  ];
}
// The faction's piece (faction-gear.mjs) as a tile: its glyph (yours, or how it comes out at your level), its name, its
// parts as pips, its stats, and the button: Assemble with the parts in, Re-tune once you hold it. Its rule on hover.
function pieceMarkup(s, f) {
  const st = pieceState(s, f), u = UNIQUES[st.id], it = st.held || uniqueItem(u, st.level, seeded(7));
  const verb = st.held ? (st.current ? 'Re-tune' : `Re-tune to v${st.level}`) : 'Assemble';
  const why = st.current ? `Already at your level (${st.held.level})` : st.parts < st.need ? `${st.need - st.parts} more ${st.need - st.parts === 1 ? 'part' : 'parts'}: win feuds for ${FX[f].short}` : busyOf(s);
  const stats = Object.entries(it.stats).filter(([k]) => STATS[k]).map(([k, v]) => `<span><b>+${fmtStat(k, v)}</b> ${esc(STATS[k].name)}</span>`).join('');
  return `<div class="piece-tile${st.found ? ' on' : ''}${st.ready ? ' ready' : ''}" style="--fc:${FX[f].color}">${glyphMarkup(it, 'lg')}<div class="piece-body"><b class="iname${st.found ? ' r-zeroday' : ''}" title="${esc(`${effectLine(it)} ${u.flavour || ''}`.trim())}">${esc(st.held ? itemLabel(st.held) : u.name)}</b><small>${esc(SLOTS[groupOf(it)]?.name || '')} · Lv ${it.level}</small>${partPips(st, 'lg')}<span class="piece-stats">${stats}${implicitRow(it)}</span></div>
    <button type="button" class="btn small${st.ready && !why ? ' primary' : ''}" data-command="hub assemble ${f}" ${st.ready && !why ? '' : `disabled title="${esc(why)}"`}>${esc(verb)}</button></div>`;
}
const busyOf = (s) => (active(s) ? 'Finish the fight first' : '');
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
  piece: { title: 'Assemble', body: (s, f) => pieceMarkup(s, f), tip: (f) => `${PARTS.need} parts from feuds won for ${FX[f].short}: the piece at your level, then a re-tune to your level` },
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
  const cond = CONDITIONS[HUB_CONDITION[f]], ev = eventOf(s), mats = materialsOf(s), shock = shockOf(s, f);
  const haveOf = (w) => (w === 'salvage' ? (s.salvage || []).length : mats[w] || 0);
  const min = Math.round(travelMs(s, f) / 60000);
  const rows = WARE_IDS.map((w) => {
    const q = quote(s, f, w), n = haveOf(w), lot = Math.min(10, n);
    // Its value here against the average across every hub: the one number that says where to sell.
    const avg = FACTION_IDS.reduce((a, g) => a + quote(s, g, w).sell, 0) / FACTION_IDS.length, d = Math.round((q.sell / avg - 1) * 100);
    const why = [cond.mult[w] ? `${cond.name} ×${cond.mult[w]}` : '', ev.mult[w] ? `${ev.name} ×${ev.mult[w]}` : '', shock?.ware === w ? `Market shock ×${shock.mult}` : ''].filter(Boolean).join(' · ');
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
  return `<div class="mk-tags"><span class="tag" title="${esc(cond.about)}">${esc(cond.name)}</span><span class="tag dim" title="${esc(ev.about)}">${esc(ev.name)}</span><span class="tag dim" title="File transfer">⇄ ${min} min</span>${shockTag(s, f)}</div>
    <div class="mk-table mk-wares">${head}${rows}</div>${flying}`;
}
const GLYPH_OF_GOOD = { relay: 'relay', cracker: 'cracker', injector: 'injector', signal: 'signal', repair: 'repair', cipher: 'cipher', worm: 'worm', kernel: 'kernel', exploit: 'exploit', salvage: 'salvage', crate: 'crate', blueprint: 'blueprint' };

// Your first class, picked right after you log in: a choice of four on the screen, each with its emblem, its archetype,
// its passive and Sync, the two skills it starts with and the subclasses it opens. Pick one, then start
// (app.js pickClass). Switching is free until a class reaches LOADOUT.trialUntil (your level comes along).
export function classPickMarkup() {
  const cards = Object.entries(ARCHETYPES).map(([k, a], i) => {
    const first = a.skills.slice(0, 2).map((x) => `<li title="${esc(x.rule || '')}"><b>${esc(x.name)}</b><small>${ruleHtml(ABILITIES[x.id]?.short || '')}</small></li>`).join('');
    const subs = Object.values(a.subs || {}).map((x) => esc(x.name)).join(' <i>or</i> ');
    return `<button type="button" class="pk-card" data-pick-class="${k}" role="radio" aria-checked="false" style="--i:${i}">
      <span class="pk-num">0${i + 1}</span>
      <span class="pk-plate"><pre class="pk-art" aria-hidden="true">${esc(EMBLEMS[k].join('\n'))}</pre></span>
      <span class="pk-name">${esc(a.name)}</span>
      <span class="pk-role">${a.role.map((r) => `<span>${esc(r)}</span>`).join('')}</span>
      <span class="pk-sec"><span class="pk-k">Passive</span><b>${esc(a.passive.name)}</b><small>${ruleHtml(a.passive.rule)}</small></span>
      <span class="pk-sec"><span class="pk-k">Sync</span><small>${ruleHtml(SYNC[k].rule)}</small></span>
      <span class="pk-sec"><span class="pk-k">Starts with</span><ul class="pk-skills">${first}</ul></span>
      <span class="pk-sec pk-later"><span class="pk-k" title="${esc(`From level ${SUBCLASS.from}`)}">Subclass</span><small>${subs}</small></span>
    </button>`;
  }).join('');
  return `<div class="pk-scene" role="dialog" aria-label="Choose your class">
    <header class="pk-head"><span class="bb-logo pk-logo" aria-hidden="true"></span><h2>Choose your class</h2><p>Switch freely on the Loadout page until level ${LOADOUT.trialUntil}. Your level comes with you.</p></header>
    <div class="pk-grid" role="radiogroup" aria-label="Classes">${cards}</div>
    <footer class="pk-foot"><span class="pk-hint">Press 1–4 or click a class to choose it. Press Enter to start.</span><button type="button" class="btn primary pk-go" disabled>Choose a class</button></footer>
  </div>`;
}

// Markup builders. Pure functions of state; they never change it.
import { SALVAGE_COSTS, stacks as salvageStacks, canAfford, costLabel as salvageLabel, payProblem, total as salvageTotal, slug } from './salvage.mjs';
import { CONFIGS, forService, known as configsKnown, owned as configsOwned, configOn, codeFor as configCode, CONFIG_COST } from './configs.mjs';
import { glyph } from './glyphs.mjs';
import { isLive, liveCount, memoryCap, memoryCost } from './memory.mjs';
import { fleetLeft } from './fleet.mjs';
import { HUBS, retakeOf, retakeLeft, lockedDown, incomeOf, bankOf, demandOf } from './hubs.mjs';
import { PAYLOADS, PAYLOAD, builtOf, flyingOf, lastStrike, defenceOf, alertOf, offline, forecastStrike } from './payload.mjs';
import { WARES, WARE_IDS, CONDITIONS, HUB_CONDITION, eventOf, quote, travelMs, transfersOf } from './market.mjs';
import { FACTIONS as FX, FACTION_IDS, rep, repTier, REP_TIERS, hubsOf, hubOf, shopOf, hostile, OWNED, captured, donationOf } from './factions.mjs';
import { GLYPHS } from './glyphs.mjs';
import { SKILL_TEXT } from './lore.mjs';
import { ARCHITECTURES, ARCH_LEVEL, ARCH_SWITCH, archOf, archCredits } from './architecture.mjs';
import { outpostPorts, modsOf, hasMod, schedulerEvery, outpostBuyout } from './outpost.mjs';
import { OUTPOST, INFEST, harvesters, harvesterName, compileCost as harvCost, canCompile, bandwidth, bandwidthUsed, stockOf, capOf, perHour, siteLabel } from './outpost.mjs';
import { ABILITIES, CONFIG, FAMILIES, MUTATIONS, TICKER, QUIRKS, DAEMONS, STRAINS, GUARDS } from './data.mjs';
import { currentLocation, takeable, liveSpawns, zoneRooms, signalNow, zoneSpawns } from './run.mjs';
import { ROGUE, rogueSpawns, rogueRooms, relockLeft } from './rogue.mjs';
import { dropOf, dropMinutes, spell } from './station.mjs';
import { matesOf, mateUp } from './crew.mjs';
import { online, inSprawl, whereText, simOn, friends, profileOf } from './presence.mjs';
import { consortiumOf, isGround, sizeOf, tiersOf, nextTier as nextConTier, serversOf, memberServers, memberLevel, CONSORTIUM, dividendOf, dividendRate, dividendSources, dividendWaiting, dividendText, rebooting, consortiumWall, alertsOf, tiersOf as conTiers } from './consortium.mjs';
import { FACTIONS, MAIL, TIERS, openContracts, offers as mailOffers, findJob, heldCount, boardOpen, indemnity, tierIndex, standing, tierOf, nextTier, retainer, unread, title as contractTitle, progress as contractProgress, rewardLine, ready as contractReady, nextPayIn } from './mail.mjs';
import { commsOf, GROUPS as COMMS_GROUPS, groupOf as commsGroup } from './comms.mjs';
import { LINE, GOODS, storeOf, lineName, lineAbout, goodsAbout, priceNow } from './store.mjs';
import { hiddenNodes, visible as hiddenVisible, flagged as hiddenFlagged, items as kitOf } from './hidden.mjs';
import { archWall } from './architecture.mjs';
import { wallRating, wallBands, ratioOf, outcome, chipRate, grindRate, fighting, degradedLeft, fmtLeft } from './invasion.mjs';
import { LOOT, SLOTS, BASES, STATS, GROUPS, RARITIES, RARITY_ORDER, ZERO_DAYS, STASH_CAP, PROTOCOL_SLOTS, PROTOCOL_STATS, SERVICES, VERSIONS, MATERIALS, statLine, itemLabel, fmtStat, sideStats, serviceCost, costLine, BLUEPRINTS, PROTOCOL_NAMES, recipeStat, SLOT_KINDS, groupOf, codeOf } from './gear.mjs';
import { ARCHETYPES, CANTRIPS, BACKTRACE, SYNC, STATUSES, LOADOUT, TREE, SERVER, SKILLS, xpToNext, unlockLevel, power } from './data.mjs';
import { cooldownOf, skillBase, knowsPart, codexKey, installBuyout, previewDamage, ignoresArmor, blocked, drawingFire, momentumStacks, momentumBonus, topUpCost, UNIQUES, effectLine, paceOf, keyMap, classOf, CANTRIP_IDS, hackerOf, hackerLevel, nextUnlock, serverLevel, serverProgress, daemonSlots, procOpen, slottedDaemons, daemonVersion, daemonNext, daemonAmount, talentPoints, loaded, loadedOn, slotCount, maxSignal, compileCost, materialsOf, serviceVersion, serviceValue, installBlock, portsUsed, portCount, cronDamage, gearStat, critChance, critMultiplier, missChance, enemyMissChance, defense, powerOf, levelGap, zeroDay, rootkitReady, cronDue, picksOf, ranksOf, freeSlot, rigOf, stashItem, knows, knownRecipes, pointsSpent, tierState, rowState, spentAbove, knownSkills, equippedSkills, cycleLength, familyInfo, defender, active, alive, virusIntegrity, armorLeft, intents, patches, readyIn, timersHidden, part } from './combat.mjs';

// WoW-style level colors: how an enemy's level compares with yours.
export const conClass = (gap) => (gap >= 5 ? 'con-red' : gap >= 3 ? 'con-orange' : gap >= -2 ? 'con-yellow' : gap > -10 ? 'con-green' : 'con-gray');
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

const ICON = { damage: 'server', encrypt: 'event-lock', blind: 'scan', replicate: 'mutation', heal: 'shell-shield' };
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const effectLabel = (i) => (i.effect === 'damage' ? `−${i.amount}` : i.effect === 'encrypt' ? `+${i.amount}` : i.effect === 'blind' ? `${i.amount} cyc` : i.effect === 'heal' ? `+${i.amount} hp` : '+frag');
const TARGETS = { damage: 'Integrity', encrypt: 'damage every cycle, stacking, until it breaks', blind: 'with every timer hidden', replicate: 'spawns a fragment', heal: 'to its most damaged part' };
let runMode = false;
const effectTarget = new Proxy(TARGETS, { get: (t, k) => (k === 'damage' && runMode ? 'Signal' : t[k]) });

// Armor chits on a part: filled = still there, hollow = broken.
// breaking: chits this cycle's hits will break (the forecast); they blink, like the white slices.
export function chitsMarkup(p, breaking = 0) {
  if (!p.maxArmor) return '';
  const going = Math.min(breaking, p.armor);
  return `<span class="chits" title="Armor: ${p.armor} of ${p.maxArmor}.${going ? ` ${going} breaks this cycle.` : ''} A hit on armor does no damage and breaks one chit; armor-piercing hits go through.">${'◆'.repeat(p.armor - going)}${going ? `<b class="going">${'◆'.repeat(going)}</b>` : ''}<i>${'◇'.repeat(p.maxArmor - p.armor)}</i></span>`;
}
const VEIL_NOTE = 'Veiled: timers stay hidden while its parts are armored. Strip the armor, or Tag a part to see its timer.';
const hiddenNote = (s) => {
  const e = s.encounter;
  if (e.blindUntil >= e.cycle) { const n = e.blindUntil - e.cycle + 1; return `Blinded: every attack timer is hidden for ${n} more ${n === 1 ? 'cycle' : 'cycles'}. Tag a part to see its timer anyway.`; }
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
    <p class="clock-line">armor ${armor.current}/${armor.max} chits · cycle ${e.cycle}</p>`;
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
      .map((i) => `<div class="intent ${c === 0 ? 'now' : c === 1 ? 'next' : ''}" title="${esc(i.name)} from ${esc(part(s, i.source)?.name)}: ${effectLabel(i)} ${effectTarget[i.effect]}"><span class="ico" ${icon(ICON[i.effect])}></span><b>${esc(i.name)}</b><small>${effectLabel(i)}</small></div>`)
      .join('');
    const quiet = !hidden && !items.length ? `<span class="quiet">${runMode ? 'quiet' : 'quiet · trace lands'}</span>` : '';
    const head = c === 0
      ? `<div class="tcol-head"><span>Now</span><span class="countdown" id="countdown">${e.paused ? 'II' : remaining.toFixed(1)}</span></div><div class="cyclebar"><span id="cyclebar" style="width:${(e.elapsedMs / CONFIG.cycleMs) * 100}%"></span></div>${youChip(s)}`
      : `<div class="tcol-head"><span>+${c}</span></div>`;
    return `<div class="tcol">${head}${chips}${quiet}</div>`;
  });
  const hiddenRow = hidden
    ? `<div class="hidden-row"><span class="tag" title="${esc(hiddenNote(s))}">${e.blindUntil >= e.cycle ? 'Blinded' : 'Veiled'}</span> ${[...new Set(list.map((i) => i.name))].map((n) => `<span class="tag dim">${esc(n)}</span>`).join(' ')}</div>`
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
    // A hit (or a burn's first tick) on armor breaks one chit; a heavy hit (CONFIG.heavyHit) or Kill Process two.
    if (armor[p.id] > 0 && !ignoresArmor(st, q.ability)) return breaks(a.chits > 1 || (!a.tick && skillBase(st, q.ability, p) >= CONFIG.heavyHit * powerOf(st) - 1e-9) ? 2 : 1);
    out.parts[p.id] = Math.min(p.integrity, (out.parts[p.id] || 0) + dmg);
  };
  const auto = !e.queue && e.lastAttack ? { ability: e.lastAttack.split(' ')[0], target: e.lastAttack.split(' ')[1] } : null;
  shoot(s, preview?.ok && preview.ability ? preview : e.queue || auto);
  for (const m of crew) shoot(m, m.encounter.queue);
  out.total = Object.values(out.parts).reduce((a, b) => a + b, 0);
  // Incoming: this cycle's visible damage attacks, plus encryption on you.
  const hits = intents(s, 1).filter((i) => i.col === 0 && !i.hidden && i.effect === 'damage').map((i) => i.amount);
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
  const extras = runMode ? '' : `<span class="hud-extra">Uplink ${e.trace}%</span>`; // encryption shows in Status
  const fc = forecast(s, preview);
  // No title of its own: the virus's name labels its health bar, its tags sit under the bar with
  // its armor. Your bar and the crew's window come first; the virus's bar is at the right.
  const tags = `${v.elite ? '<span class="tag hot tag-elite" title="Elite: built for a crew. Much tougher; three times the XP and drop rolls.">elite</span>' : ''}${e.invader && s.invasion?.id === e.invader ? `<span class="tag hot">invasion · ${esc(s.invasion.fromName)}</span>` : ''}${m ? `<span class="tag tag-mut" data-mut="${v.mutation}" title="${esc(m.rule)}">${esc(m.name)}</span>` : ''}${strainTags(s, v)}${weak ? `<span class="tag you">weak: ${esc(weak.name)}</span>` : ''}`;
  // Yours first (what you watch): your Signal with the crew under it; the virus's total at the right,
  // over its picture.
  return `<div class="hud-left"><div class="hud-you"><div class="hud-bar mine ${level}"><div class="bar-top"><strong>${glyph(runMode ? 'signal' : 'integrity', 'bar-ico')}${mine}</strong><span>${d.integrity}<small>/${d.max}</small></span></div><div class="bigbar"><span style="width:${dp}%"></span>${lossMark(d.integrity, d.max, fc.you)}</div><p class="clock-line">${extras}</p></div>${party ? partyMarkup(s, fc) : ''}</div>${statusPanel(s)}</div>
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

// Your crew's health (party frames): a little window under your Signal, side by side. Where they aim is
// their avatar on the part's rail; what they did is the number on the part and the log.
function partyMarkup(s, fc) {
  const e = s.encounter;
  const crew = e.mode === 'run' ? matesOf(s).filter((m) => m.encounter) : [];
  if (!crew.length) return '';
  const actedWho = e.steps?.order?.[e.steps.next - 1], acted = actedWho ? crew.find((m) => m.who === actedWho) : null; // whose turn just played
  return `<div class="hud-bar hud-crew"><div class="bar-top"><strong>Crew</strong></div><div class="party">${crew.map((m) => {
    const up = mateUp(m), pct = (m.run.integrity / m.run.max) * 100, q = m.encounter.queue;
    return `<div class="pmate${up ? '' : ' down'}${m === acted ? ' acting' : ''}" data-mate="${esc(m.who)}" title="${esc(`${m.who} · ${ARCHETYPES[m.loadout.archetype].name}${up ? (q ? ` · ${q.text}` : '') : ' · down'}`)}"><b>${esc(m.who)}</b>${up && drawingFire(m) ? '<span class="tag hot" title="Every attack comes at them (Firewall)">drawing fire</span>' : ''}<span class="pbar"><span style="width:${pct}%"></span>${lossMark(m.run.integrity, m.run.max, fc.mates[m.who] || 0)}</span><small>${up ? `${m.run.integrity}/${m.run.max}` : 'down'}</small></div>`;
  }).join('')}</div></div>`;
}

function attackChip(i, c, k = '', to = null) {
  return `<div class="intent ${c === 0 ? 'now' : c === 1 ? 'next' : ''}" ${k ? `data-k="${esc(k)}"` : ''} title="${esc(i.name)}: ${effectLabel(i)} ${to ? `at ${esc(to)}` : effectTarget[i.effect]}"><span class="ico" ${icon(ICON[i.effect])}></span><b>${esc(i.name)}</b><small>${effectLabel(i)}</small>${to ? `<small class="at">→ ${esc(to)}</small>` : ''}</div>`;
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
  return `<section class="card codex-card"><h2>Codex · ${known}/${all.length}</h2><div class="codex">${groups.map(([k, name, parts]) => `<div class="cx-group"><b>${esc(name)}</b><ul>${parts.map((p) => { const on = !!s.codex?.[`${k}:${p.id}`]; return `<li class="${on ? 'on' : ''}"><span>${esc(p.name)}</span><small>${on ? esc(partAbout(p)) : '???'}</small></li>`; }).join('')}</ul></div>`).join('')}</div></section>`;
}
// What a component does, in a line (the codex). ??? until you've broken one.
export function partAbout(p) {
  const a = p.attack, out = [];
  if (a) {
    const every = a.interval && a.interval < 900 ? ` every ${a.interval} ${a.interval === 1 ? 'cycle' : 'cycles'}` : '';
    if (a.effect === 'damage') out.push(a.dump ? `${a.name}: a big hit once it has logged 3 keystrokes` : a.alarm ? `${a.name}: raises the alarm, then hits ${a.amount}${every}` : `${a.name}: hits you for ${a.amount}${every}${a.ramp ? ', more each time' : ''}${a.siphon ? ', and heals itself' : ''}${a.grow ? ', growing as the fight goes on' : ''}${a.windup ? `; enough damage while it winds up calls it off` : ''}`);
    else if (a.effect === 'encrypt') out.push(`${a.name}: locks part of you, ${a.amount} more each time, until it breaks`);
    else if (a.effect === 'blind') out.push(`${a.name}: hides every attack timer for ${a.amount} cycles${every}`);
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
  return out.join('; ') || 'no attack of its own';
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
  const burn = (e.burns || []).filter((b) => b.target === p.id);
  if (burn.length) tags.push(`<span class="tag you" title="Takes damage every cycle">burning ${burn.reduce((n, b) => n + b.damage, 0)}</span>`);
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
  add('Blinded', e.blindUntil, 'hot', hiddenNote(s), CONFIG.blindside > 1 ? `hits +${Math.round((CONFIG.blindside - 1) * 100)}%` : '');
  return out;
}

// Rows = parts, columns = cycles. Health and timing on the same line.
export function boardMarkup(s, selected, preview = null) {
  const e = s.encounter;
  runMode = e.mode === 'run';
  const fighting = active(s);
  const fc = forecast(s, preview);
  // Damage on the timeline is what you'll actually take after your Reduction.
  const list = fighting ? intents(s, 4).map((i) => (i.effect === 'damage' ? { ...i, amount: blocked(s, i.amount) } : i)) : [];
  const hidden = fighting && timersHidden(s);
  const remaining = Math.max(0, (cycleLength(s) - e.elapsedMs) / 1000);
  const quietCol = (c) => fighting && !hidden && !list.some((i) => i.col === c);
  const head = `<div class="brow bhead"><div class="bcell bname">Part</div>
    <div class="bcell bnow"><span>Now <small class="cyc">cycle ${e.cycle}</small></span><span class="countdown" id="countdown">${!fighting ? '—' : e.paused ? 'II' : remaining.toFixed(1)}</span><div class="cyclebar">${e.sync && fighting ? `<i class="sync-win${e.sync.surprise ? ' surprise' : ''}" id="sync-win" style="left:${(e.sync.at * 100).toFixed(1)}%;width:${(e.sync.width * 100).toFixed(1)}%" title="${esc(e.sync.surprise ? `Surprise: fire while the bar is here. Inject lands an extra stack, Tag lasts ${CONFIG.surprise.tagCycles} cycles with burns +${Math.round((CONFIG.surprise.tagged - 1) * 100)}%, Traceroute adds ${CONFIG.surprise.trace}%.` : `Sync Window: fire your command while the bar is here for +${Math.round(CONFIG.sync.bonus * 100)}% damage. ${SYNC[classOf(s)]?.rule || ''}`)}"></i>` : ''}<span id="cyclebar" style="width:${(e.elapsedMs / cycleLength(s)) * 100}%"></span></div></div>
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

  const living = e.virus.parts.filter(alive), broken = e.virus.parts.filter((p) => !alive(p));
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
      const patchChip = patch?.col === c ? `<div class="intent patch" data-k="patch:${esc(p.id)}@${e.cycle + c}" title="${esc(p.name)} patches one armor chit back at the end of ${c === 0 ? 'this cycle' : `cycle ${e.cycle + c}`}, unless you break it first">◆ patch</div>` : '';
      if (timersHidden(s, p) && p.attack) return `<div class="bcell">${cryptChip}<div class="intent hidden">?</div>${patchChip}</div>`;
      const hit = mine.find((i) => i.col === c);
      // With a crew, a damage attack lands on everyone, or on whoever is drawing fire.
      const to = crew.length && hit?.effect === 'damage' ? sink || 'all' : null;
      return `<div class="bcell">${cryptChip}${hit ? attackChip(hit, c, `${p.id}@${e.cycle + c}`, to) : ''}${patchChip}</div>`;
    }).join('');
    const spike = p.armor > 0 ? 'spike breaks an armor chit' : `spike deals ${previewDamage(s, 'spike', p)}`;
    const marks = partMarks(s, p);
    return `<button type="button" class="brow bpart ${selected === p.id ? 'selected' : ''} ${nowHit ? 'now' : ''} ${p.maxArmor && !p.armor ? 'cracked' : ''} ${marks.map((k) => 'm-' + k).join(' ')}" data-target="${esc(p.id)}" ${fighting ? '' : 'disabled'} title="Target ${esc(p.name)}: ${spike}${knowsPart(s, e.virus, p) ? '' : ' · what it does: ???'}">
      <div class="bcell bname">${pips(p.id)}<span class="part-top"><span class="part-name" data-tip="${esc(knowsPart(s, e.virus, p) ? partAbout(p) : '??? Break one to find out what it does.')}">${esc(p.name)}${knowsPart(s, e.virus, p) ? '' : '<sup class="unk">?</sup>'}</span>${marksMarkup(marks)}${chitsMarkup(p, fc.chits[p.id] || 0)}<span class="part-hp">${p.integrity}/${p.max}</span></span><span class="part-bar"><span style="width:${pct}%"></span>${lossMark(p.integrity, p.max, fc.parts[p.id] || 0)}</span><span class="part-tags">${partTags(s, p)}</span></div>
      ${p.attack ? cells : '<div class="bcell span4"></div>'}</button>`;
  }).join('');
  const gone = broken.length ? `<div class="brow bbroken"><div class="bcell span5">Broken: ${broken.map((p) => esc(p.name)).join(', ')}</div></div>` : '';
  return head + you() + rows + gone;
}

const LOG_CLASS = { miss: 'warn', evaded: 'good', regen: 'dim', 'pack-hit': 'bad', heal: 'good',  resolved: 'you', 'server-hit': 'bad', encrypt: 'bad', encrypted: 'bad', decrypted: 'good', blind: 'bad', spawn: 'bad', crashed: 'bad', broken: 'good', loot: 'good', victory: 'good', scan: 'good', trace: 'good', armor: 'you', patch: 'warn', warning: 'warn', 'daemon-set': 'daemon', fled: 'warn', interrupt: 'you', status: 'you', vault: 'note', hold: '', 'trace-lost': 'warn', 'warning-soft': 'warn', blocked: 'note', intrusion: 'note', engage: 'note', damage: 'you' };

export function logMarkup(s, limit = 60) {
  const start = s.logs.findLastIndex((e) => e.type === 'intrusion');
  const lines = s.logs.slice(Math.max(0, start)).filter((e) => e.type !== 'queued').slice(-limit);
  return lines.map((e) => `<li${e.who ? ' class="crew"' : ''}><span class="c">c${e.cycle}</span><span class="${e.auto === 'daemon' ? 'daemon' : LOG_CLASS[e.type] ?? ''}">${e.who ? `<b class="who">${esc(e.who)}</b> ` : ''}${esc(e.message)}</span></li>`).join('');
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
    if (id === 'traceroute' && e?.mode === 'run' && !e.zone) return `<button type="button" class="ability cantrip cooling" disabled title="Backtracing only works on intrusions at home"><span class="ico" ${icon(a.icon)}></span><span class="name"><kbd>${key}</kbd>${esc(a.name)}</span><span class="state">home only</span></button>`;
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
    const taken = Object.keys(l.state.taken).length, total = takeable(l).length;
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

// The stash's filter (screen state only).
export const stashUi = { filter: 'all' };
// One item as an inventory row: rarity edge (CSS), slot glyph, name and level, then its stats in one line.
const invStats = (it) => Object.entries(it.stats).filter(([k]) => STATS[k]).map(([k, v]) => `<span class="${v < 0 ? 'neg' : ''}"><b>${v < 0 ? '−' + fmtStat(k, -v) : '+' + fmtStat(k, v)}</b> ${esc(STATS[k].name)}</span>`).join('');
function invBody(it, extra = '') {
  const fx = it.zeroDay ? ZERO_DAYS[it.zeroDay].effect : it.unique ? effectLine(it) : '';
  return `<span class="inv-icon" aria-hidden="true">${glyph(leadStat(it))}</span><span class="inv-main" title="${esc(itemTitle(it))}"><span class="inv-name"><b class="iname ${rarityClass(it)}">${esc(itemLabel(it))}</b><small>${esc(SLOTS[groupOf(it)]?.name || '')} · Lv ${it.level}</small>${extra}</span><span class="inv-stats">${invStats(it)}</span>${fx ? `<span class="inv-fx">${esc(fx)}</span>` : ''}</span>`;
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
    const loadBtn = `<button type="button" class="inv-btn load" data-command="load ${it.id}" ${busy || full || dupe ? 'disabled' : ''} title="${full ? `No ${SLOTS[groupOf(it)]?.name || ''} slot yet` : dupe ? 'You already run this one' : swap ? 'Swap it in for what you run now' : 'Load it into a free slot'}">${swap ? 'Swap' : 'Load'}</button>`;
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
  return `<section class="card stash-card"><h2>Stash · ${p.stash.length}/${STASH_CAP}</h2>${p.spare.length ? `${p.filters}<ul class="inv">${p.rows || '<li class="inv-row empty"><span class="inv-empty">none of these</span></li>'}</ul>` : '<p class="svc-line">empty</p>'}</section>`;
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

export function craftMarkup(s, focus = null) {
  const p = protocolsParts(s, focus), srv = s.server, busy = p.busy;
  const why = s.run ? 'Craft at home: jack out first' : active(s) ? 'Finish the fight first' : '';
  const t = (x) => (why ? `title="${esc(why)}"` : '');
  // Protocols
  const protoBody = `${p.mine.length ? `<div class="craft-row">${p.picker}${needChips(s, { credits: p.c.credits, salvage: p.ccost })}<button type="button" class="btn primary" data-command="compile${p.focus ? ' ' + p.focus : ''}" data-pay="protocol:${p.c.salvage}" data-pay-title="${esc(p.focus && STATS[p.focus] ? PROTOCOL_NAMES[p.focus] : 'Protocol')}" ${p.can(p.c) ? '' : 'disabled'} ${t()}>Compile${p.focus && STATS[p.focus] ? ' · ' + esc(PROTOCOL_NAMES[p.focus]) : ''}</button>${serviceVersion(s, 'buildfarm') ? ` <span class="tag you">−${serviceValue(s, 'buildfarm')}%</span>` : ''}</div>` : '<p class="quiet" title="Blueprints teach them">No recipes</p>'}
      ${(s.recipes || []).some((z) => ZERO_DAYS[z]) ? `<h3 class="craft-sub">Zero-day source</h3><ul class="craft-list">${(s.recipes || []).filter((z) => ZERO_DAYS[z]).map((z) => `<li><span><b class="iname r-zeroday" title="${esc(ZERO_DAYS[z].effect)}">${esc(ZERO_DAYS[z].name)}</b>${needChips(s, { credits: p.zc.credits, salvage: p.zcost })}</span><button type="button" class="btn primary small" data-command="compile ${z}" data-pay="zeroday:${p.zc.salvage}" data-pay-title="${esc(ZERO_DAYS[z].name)}" ${p.can(p.zc) ? '' : 'disabled'} ${t()}>Compile</button></li>`).join('')}</ul>` : ''}`;
  const protoCard = craftSection(s, 'protocols', `Protocols · Lv ${p.lvl} · ${p.mine.length}/${PROTOCOL_STATS.length} recipes`, 'A blue protocol at your level, built around the stat you pick.', protoBody);
  // Configs: sources you've banked, crafted once each
  const cfgs = configsKnown(s);
  const cfgCard = cfgs.length ? craftSection(s, 'configs', `Configs · ${configsOwned(s).length}/${Object.keys(CONFIGS).length}`, 'Change how one of your services behaves. Crafted once, kept.', `<ul class="craft-list">${cfgs.map((id) => { const c = CONFIGS[id], got = configsOwned(s).includes(id), code = configCode(id), okc = !busy && srv.credits >= CONFIG_COST.credits && (materialsOf(s)[code] || 0) >= CONFIG_COST.code && canAfford(s, SALVAGE_COSTS.config()); return `<li><span><b class="iname" title="${esc(c.rule)}">${glyph(c.service, 'badge')}${esc(c.name)} <span class="tag dim">${esc(SERVICES[c.service].name)}</span></b>${got ? '' : needChips(s, { credits: CONFIG_COST.credits, code: { [code]: CONFIG_COST.code }, salvage: SALVAGE_COSTS.config() })}</span>${got ? '<span class="tag you">owned</span>' : `<button type="button" class="btn primary small" data-command="craft config ${id}" data-pay="config" data-pay-title="${esc(c.name)}" ${okc ? '' : 'disabled'} ${t()}>Craft</button>`}</li>`; }).join('')}</ul>`) : '';
  // Harvesters
  const anyOwned = s.locations.some((l) => l.takenOver) || harvesters(s).length;
  const harvCard = anyOwned ? craftSection(s, 'harvesters', `Harvesters · rack ${harvesters(s).length}/${OUTPOST.stashCap}`, 'Goes on a server you took over and makes code while you play or sleep.', `<ul class="craft-list">${Object.keys(OUTPOST.kinds).map((k) => { const c = harvCost(k, s); return `<li><span><b class="iname">${glyph(k, 'badge')}${esc(OUTPOST.kinds[k].name)}</b><small>${esc(OUTPOST.kinds[k].about)}</small>${needChips(s, { credits: c.credits, code: { [c.material]: c.code }, salvage: c.salvage })}</span><button type="button" class="btn primary small" data-command="outpost compile ${k}" data-pay="harvester-${k}" data-pay-title="${esc(OUTPOST.kinds[k].name)}" ${!busy && canCompile(s, k) ? '' : 'disabled'} ${t()}>Craft</button></li>`; }).join('')}</ul>`) : '';
  // What you have to build with: a grid of counts.
  const stock = `<section class="card"><h2>Materials</h2>${matGrid(s)}
      ${salvageStacksMarkup(s)}</section>`;
  return `<div class="page-grid gear-page"><div style="display:grid;gap:12px;align-content:start">${protoCard}${cfgCard}${harvCard}</div><div style="display:grid;gap:12px;align-content:start">${stock}</div></div>`;
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
    case 'firewall': { const b = wallBands(s, 100 * power(serverLevel(s)) * x); return `your wall ${b.blocks ? `blocks up to level ${b.blocks}` : 'blocks none outright'}, contests up to level ${b.holds}`; }
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
// with your level and an incoming invader marked on it.
export function wallRuler(s, compact = false, bands = wallBands(s)) {
  if (s.degraded) return '<div class="wall-ruler down" title="Your wall is down while the server is degraded"><span>wall down</span></div>';
  const { blocks, holds } = bands, you = hackerLevel(s), inv = s.invasion;
  const hi = Math.max(holds + 4, you + 4, (inv?.level || 0) + 2, 8), pct = (lv) => `${Math.min(100, (lv / hi) * 100)}%`;
  const seg = (cls, from, to, icon, tip) => (to > from ? `<span class="wr-seg ${cls}" style="left:${pct(from)};width:calc(${pct(to)} - ${pct(from)})" title="${esc(tip)}">${compact ? '' : glyph(icon)}</span>` : '');
  const mark = (lv, cls, label) => `<span class="wr-mark ${cls}" style="left:${pct(lv - 0.5)}" title="${esc(label)}"><i></i><small>${esc(label)}</small></span>`;
  return `<div class="wall-ruler${compact ? ' compact' : ''}" title="${esc(bandsText(s))}">
    <div class="wr-track">${seg('blocked', 0, blocks, 'firewall', blocks ? `Stopped at the wall: up to level ${blocks}` : '')}${seg('siege', blocks, holds, 'tarpit', `Contested: level ${blocks + 1}–${holds}`)}${seg('breach', holds, hi, 'kill', `Breaks through: level ${holds + 1} and up`)}</div>
    <div class="wr-marks">${mark(you, 'you', `you ${you}`)}${inv ? mark(inv.level, 'inv ' + inv.state, `${inv.name} ${inv.level}`) : ''}</div>
    ${compact ? '' : `<div class="wr-scale"><span>1</span>${blocks ? `<span style="left:${pct(blocks)}">${blocks}</span>` : ''}${holds > blocks ? `<span style="left:${pct(holds)}">${holds}</span>` : ''}<span style="left:100%">${hi}</span></div>`}
  </div>`;
}
export function wallMarkup(s, now = Date.now()) {
  const inv = s.invasion, st = invaderStatus(s);
  const v = serviceVersion(s, 'firewall');
  const bar = st && inv.state !== 'travel' ? `<div class="wall-bar ${inv.state}"><span style="width:${Math.max(0, Math.min(100, Math.round(inv.hp * 100)))}%"></span></div>` : '';
  const bands = wallRuler(s);
  const body = inv
    ? `<div class="invader ${inv.state}"><div class="gitem-head"><b>${esc(inv.name)}</b>${levelTag(s, inv.level)}${inv.mutation ? `<span class="tag tag-mut" data-mut="${inv.mutation}" title="${esc(MUTATIONS[inv.mutation].rule)}">${esc(MUTATIONS[inv.mutation].name)}</span>` : ''}<span class="tag ${inv.state === 'breach' ? 'hot' : ''}">${esc(invaderShort(s))}</span></div><small>${esc(inv.fromName)}</small>${bar}${inv.state !== 'travel' ? `<div class="row">${jackInButton(st)}</div>` : ''}</div>`
    : '';
  return `<section class="card wall-card"><h2>Wall</h2><h1>${v ? `Firewall v${v}` : 'No Firewall'}</h1>${degradedMarkup(s, now)}${bands}${body}</section>`;
}

// A running service's configs: stock plus the ones you own; the running one is lit.
function configRow(s, id, busy) {
  const all = forService(id);
  if (!all.length) return '';
  const on = configOn(s, id), mine = all.filter((k) => configsOwned(s).includes(k));
  const chip = (k, label, tip) => `<button type="button" class="cfg${(on || null) === k ? ' on' : ''}" data-command="config ${id} ${k || 'none'}" ${busy ? 'disabled' : ''} title="${esc(tip)}" aria-pressed="${(on || null) === k}">${k ? glyph('config') : ''}${esc(label)}</button>`;
  const missing = all.length - mine.length;
  return `<div class="cfg-row"><span class="cfg-label">Config</span>${chip(null, 'Stock', 'The service as it comes.')}${mine.map((k) => chip(k, CONFIGS[k].name, CONFIGS[k].rule)).join('')}${missing ? `<span class="cfg-missing" title="Config source for this service turns up in vaults">+${missing} to find</span>` : ''}</div>`;
}
// Server architecture: picked at server level 20, a trade each way.
function archMarkup(s) {
  const lvl = serverLevel(s), cur = archOf(s), busy = active(s);
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
    const x = VERSIONS[v - 1];
    return `<small>v${v}: ${esc(serviceEffect(s, id, v))} · ${esc(costLine({ ...serviceCost(id, v), salvage: x.salvage }))} · ${x.minutes} min${x.needs > 1 ? ` · server Lv ${x.needs}` : ''}</small>
      <button type="button" class="btn ${why ? '' : 'primary'} small" data-command="install ${id}" ${why || busy ? 'disabled' : ''} title="${esc(why || (v > 1 ? 'Upgrade' : 'Install'))}">${v > 1 ? `Upgrade to v${v}` : 'Install'}</button>`;
  };
  const running = Object.keys(s.services || {}).map((id) => `<li class="svc on"><div class="svc-main"><div class="gitem-head"><b class="svc-name">${glyph(id, 'badge')}${esc(SERVICES[id].name)}</b><span class="tag you">v${serviceVersion(s, id)}</span></div>
      <small>${esc(serviceEffect(s, id, serviceVersion(s, id)))}</small>${configRow(s, id, busy)}<div class="svc-next">${next(id)}</div></div>
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
  return `${e.here?.length ? `<div class="ls-here">here ${peopleChips(e.here)}</div>` : ''}<div class="ls">${e.entries.map((x) => {
    const tags = x.tags.filter((t) => !(t === 'pull' && x.pull)).map((t) => `<span class="tag tag-${esc(t)} ${t === 'guarded' || t === 'hostile' ? 'hot' : 'dim'}">${esc(t)}</span>`).join('');
    const name = x.kind === 'dir' ? (x.name === '..' ? '..' : x.name + '/') : x.name;
    const main = x.cmd.endsWith(' ') ? `data-prefill="${esc(x.cmd)}"` : `data-run="${esc(x.cmd)}"`;
    return `<div class="ls-row"><span class="ls-kind">${x.kind === 'dir' ? 'd' : x.kind === 'virus' ? '!' : '-'}</span><button type="button" class="tok ${x.kind}" ${main} title="${esc(x.cmd.trim())}">${esc(name)}</button><span class="ls-size">${esc(x.size || '')}</span>${tags}${peopleChips(x.people)}${x.pull ? `<button type="button" class="tok act" data-run="${esc(x.pull)}">pull</button>` : ''}</div>`;
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

// The crew strip (run.mjs crewMove / crewWander): where each crewmate is on this server, linked
// to you or off on their own, with Go to / Link / Split, and Regroup when anyone's apart.
function crewStrip(s, loc) {
  const crew = Object.entries(s.run.crew || {});
  if (!crew.length) return '';
  const mates = Object.fromEntries(matesOf(s).map((m) => [m.who, m]));
  const card = ([name, c]) => {
    const m = mates[name], cls = (s.crewSim || []).find((x) => x.name === name)?.cls, sig = m?.run ? Math.round((m.run.integrity / m.run.max) * 100) : 100;
    const linkedYou = c.link === 'you', youFollow = s.run.linkedTo === name, here = c.cwd === s.run.cwd;
    const state = linkedYou ? '<span class="cs-link">⛓ with you</span>' : youFollow ? '<span class="cs-link lead">⛓ you follow</span>' : '<span class="cs-off">on their own</span>';
    const acts = [
      linkedYou ? `<button type="button" class="act" data-run="split ${esc(name)}">Split</button>` : '',
      !linkedYou && !here ? `<button type="button" class="act" data-run="goto ${esc(name)}">Go to</button>` : '',
      !linkedYou && !youFollow ? `<button type="button" class="act" data-run="link ${esc(name)}">Link</button>` : '',
      youFollow ? '<button type="button" class="act" data-run="unlink">Unlink</button>' : '',
      `<button type="button" class="act dim" data-run="crew kick ${esc(name)}" title="Take ${esc(name)} out of your crew">Remove</button>`,
    ].join('');
    return `<div class="cs-card${linkedYou || youFollow ? ' linked' : ''}${here ? ' here' : ''}"><div class="cs-top"><b>${esc(name)}</b><small>${cls ? esc(ARCHETYPES[cls].name) : ''}</small></div><span class="cs-sig"><span style="width:${sig}%"></span></span><div class="cs-where">${esc(c.cwd)}</div><div class="cs-state">${state}</div><div class="cs-acts">${acts}</div></div>`;
  };
  const apart = crew.some(([, c]) => c.link !== 'you');
  return `<div class="crew-strip"><div class="cs-card you"><div class="cs-top"><b>you</b><small>${esc(ARCHETYPES[classOf(s)].name)}</small></div><span class="cs-sig"><span style="width:${(s.run.integrity / s.run.max) * 100}%"></span></span><div class="cs-where">${esc(s.run.cwd)}</div>${apart ? '<div class="cs-acts"><button type="button" class="act" data-run="regroup">Regroup</button></div>' : `<div class="cs-acts"><button type="button" class="act dim" data-run="split all">Split all</button></div>`}</div>${crew.map(card).join('')}</div>`;
}

export const signalLevel = (run) => (run.integrity / run.max <= 0.3 ? 'low' : run.integrity / run.max <= 0.6 ? 'mid' : 'ok');

export function netMarkup(s) {
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
      <button type="button" class="net-pack" data-run="pack" title="What you're carrying (unbanked)">pack <b>${s.run.pack.length}</b></button>
    </header>
    ${crewStrip(s, loc)}
    <ol class="term" id="term">${netTranscript(s)}</ol>
  </section>`;
}

export function netTrayMarkup(actions) {
  return `<div class="next"><span class="next-label">here:</span>${actions.map((a) => `<button type="button" class="nextbtn ${a.hot ? 'hot' : ''}" ${a.prefill ? `data-prefill="${esc(a.prefill)}"` : `data-run="${esc(a.cmd)}"`}>${esc(a.label)}${a.note ? `<small>${esc(a.note)}</small>` : ''}</button>`).join('')}<button type="button" class="nextbtn quiet" data-run="help">help</button></div>`;
}

// ---------- daemons ----------

// A daemon's rule with its real number (version and your power).
const daemonRule = (s, id) => (DAEMONS[id].amount ? DAEMONS[id].rule.replace(String(DAEMONS[id].amount), String(id === 'tracer' ? Math.round(DAEMONS[id].amount * [1, 1.5, 2][daemonVersion(s, id) - 1]) : daemonAmount(s, id))) : DAEMONS[id].rule);
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
const jobTag = (s, c) => (c.done ? ['Done', 'dim'] : contractReady(s, c) ? ['Ready', 'you'] : c.offBooks ? ['Off books', 'hot'] : c.story !== undefined ? ['LOWLIGHT', ''] : ['Taken', '']);
function jobBox(s, c, now) {
  const isOffer = c.expiresAt != null;
  const pr = contractProgress(s, c), ok = contractReady(s, c);
  const full = heldCount(s) >= MAIL.take;
  const acts = c.done ? '' : isOffer
    ? `<button type="button" class="btn primary" data-command="mail accept ${c.id}" ${full ? `disabled title="You hold ${MAIL.take} contracts. Deliver or drop one first."` : ''}>Take</button>`
    : `<button type="button" class="btn primary" data-command="mail deliver ${c.id}" ${ok ? '' : 'disabled'}>Deliver</button>${c.story === undefined ? `<button type="button" class="btn" data-command="mail drop ${c.id}">Drop</button>` : ''}`;
  return `<div class="contract${ok ? ' ready' : ''}${c.done ? ' done' : ''}${isOffer ? ' offer' : ''}">
    <div class="c-head"><b>${glyph({ kill: 'kill', bounty: 'bounty', takeover: 'takeover', materials: 'materials', item: 'item' }[c.type] || 'item', 'badge')}${esc(contractTitle(s, c))}</b>${c.offBooks ? '<span class="tag hot">Off the books</span>' : ''}${isOffer ? `<small class="c-exp">expires in ${fmtTime(c.expiresAt - now)}</small>` : ''}</div>
    ${isOffer ? '' : `<div class="lvl-row"><span class="lvl-bar"><span style="width:${Math.round(pr.part * 100)}%"></span></span><small>${esc(pr.text)}</small></div>`}
    <p class="svc-line">${c.done ? 'Paid' : 'Pays'}: ${esc(rewardLine(s, c))}</p>
    ${acts ? `<div class="row">${acts}</div>` : ''}
  </div>`;
}
export function mailMarkup(s, sel = null, now = Date.now()) {
  const letters = s.mail?.list || [], held = openContracts(s), board = [...mailOffers(s)].sort((a, b) => a.expiresAt - b.expiresAt);
  const pickSel = () => {
    if (sel?.[0] === 'l') { const l = letters.find((m) => m.id === Number(sel.slice(1))); if (l) return { letter: l }; }
    if (sel?.[0] === 'j') { const j = findJob(s, Number(sel.slice(1))); if (j) return { job: j }; }
    const l = letters.find((m) => !m.read);
    if (l) return { letter: l };
    if (held[0]) return { job: held[0] };
    return letters[0] ? { letter: letters[0] } : {};
  };
  const open = pickSel();
  const isOpen = (k) => (open.letter && k === 'l' + open.letter.id) || (open.job && k === 'j' + open.job.id);
  const row = (k, from, subject, tag, cls, extra = '', unreadRow = false) => `<li><button type="button" class="mrow${unreadRow ? ' unread' : ''}${isOpen(k) ? ' open' : ''}" data-mail="${k}"><span class="mfrom">${esc(from)}</span><span class="msubj">${esc(subject)}</span>${tag ? `<span class="tag ${cls}">${tag}</span>` : extra}</button></li>`;
  const heldRows = held.map((c) => { const [t, cls] = jobTag(s, c); return row('j' + c.id, c.from, contractTitle(s, c), t, cls); }).join('');
  const boardRows = board.map((c) => row('j' + c.id, c.from, c.subject, c.offBooks ? 'Off books' : '', c.offBooks ? 'hot' : '', `${fIcon(c.faction || 'halcyon')}<small class="mexp">${fmtTime(c.expiresAt - now)}</small>`)).join('');
  const letterRows = letters.map((m) => row('l' + m.id, m.from, m.subject, '', '', '', !m.read)).join('');
  const st = standing(s), tier = tierOf(s), next = nextTier(s);
  const head = `<div class="standing" title="Standing ${st}/100${next ? `. ${next.name} at ${next.min}` : ''}. Contracts raise it; a crash on your server lowers it, and so does work for GLASSJAW.">
      <span class="st-name">${esc(FACTIONS.halcyon.name)}</span><span class="tag ${st ? 'you' : 'hot'}">${esc(tier.name)}</span>
      <span class="lvl-bar"><span style="width:${st}%"></span></span><b>${st}</b></div>
    <p class="svc-line">Retainer ${retainer(s)} credits · next in <span id="pay-left">${fmtTime(nextPayIn(s, now))}</span> · <b class="ind" title="Indemnity: Halcyon scrip, spent at its store.">${indemnity(s)} Indemnity</b></p>
    ${hubsOf(s).length ? `<div class="reps">${FACTION_IDS.filter((f) => f !== 'halcyon').map((f) => `<button type="button" class="rep-chip" style="--fc:${FX[f].color}" data-go="hub:${f}" title="${esc(FX[f].name)}: ${rep(s, f)} · ${esc(repTier(s, f).name)}">${glyph('f-' + f)}<span>${esc(repTier(s, f).name)}</span></button>`).join('')}</div>` : ''}`;
  let reader = '<section class="card mread"><p class="quiet">No mail.</p></section>';
  const item = open.letter || open.job;
  if (item) {
    const j = open.job || (open.letter.job != null ? findJob(s, open.letter.job) : null);
    reader = `<section class="card mread"><h2>${esc(item.from)}</h2><h1>${esc(item.subject)}</h1><div class="mbody">${(item.body || []).filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('')}</div>${j ? jobBox(s, j, now) : ''}</section>`;
  }
  return `<div class="page-grid mail-page"><section class="card inbox">${head}
    <h2>Contracts · ${heldCount(s)}/${MAIL.take}</h2>${heldRows ? `<ul class="mlist">${heldRows}</ul>` : '<p class="quiet">None taken.</p>'}
    ${boardOpen(s) ? `<h2>Board · ${board.length}</h2>${boardRows ? `<ul class="mlist mboard">${boardRows}</ul>` : '<p class="quiet">Nothing on offer right now.</p>'}` : ''}
    <h2>Letters${unread(s) ? ` · ${unread(s)} unread` : ''}</h2><ul class="mlist">${letterRows}</ul></section>${reader}</div>`;
}

// ---------- the pager's list (Comms) ----------
const agoShort = (ms) => (ms < 60000 ? `${Math.max(0, Math.round(ms / 1000))}s` : ms < 3600000 ? `${Math.floor(ms / 60000)}m` : ms < 86400000 ? `${Math.floor(ms / 3600000)}h` : `${Math.floor(ms / 86400000)}d`);
const GO_LABEL = { mail: 'Open', store: 'Store', map: 'Map', jack: 'Jack in' };
export function commsMarkup(s, filter = 'all', now = Date.now()) {
  const all = commsOf(s);
  const shown = all.filter((c) => filter === 'all' || commsGroup(c.kind) === filter);
  const rows = shown.map((c) => `<li class="citem ${c.kind}${c.seen ? '' : ' unseen'}${c.done ? ' done' : ''}"><span class="k ${c.kind}">${esc(c.label)}</span><span class="cfrom">${esc(c.from)}</span><span class="cage">${agoShort(now - c.t)}</span><p>${esc(c.text)}</p>${c.go ? `<button type="button" class="act" data-go="${esc(c.go)}" data-cid="${c.id}">${GO_LABEL[c.go.split(':')[0]] || 'Open'}</button>` : ''}${c.done ? '' : `<button type="button" class="act dim cdone" data-cdone="${c.id}" title="Handled">✓</button>`}</li>`).join('');
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
    <div class="row con-leave"><button type="button" class="btn small" data-command="consortium leave" data-confirm="Leave ${esc(c.name)}? Everything of yours stays yours.">Leave</button></div>
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

  const tabs = Object.entries(ARCHETYPES).map(([k, x]) => `<button type="button" class="arch${k === id ? ' on' : ''}" data-arch="${k}" aria-pressed="${k === id}">
      <span class="arch-name">${esc(x.name)} <span class="tag dim">Lv ${hackerLevel(s, k)}</span>${k === equippedArch ? ' <span class="tag you">in use</span>' : ''}</span><span class="arch-idea">${esc(x.idea)}</span></button>`).join('');

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
    <nav class="ltabs" role="tablist" aria-label="Loadout">${[['protocols', `Protocols${(s.stash || []).length ? ` · ${(s.stash || []).length}` : ''}`], ['skills', `Skills and talents${Math.max(0, points - spent) ? ` · ${Math.max(0, points - spent)} free` : ''}`]].map(([k, l]) => `<button type="button" role="tab" data-ltab="${k}" aria-selected="${tab === k}">${esc(l)}</button>`).join('')}</nav>
    ${tab === 'skills' ? `
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
          <li class="troot${lvl < unlockLevel(id, 'backtrace') ? ' locked' : ''}"><span class="tag">${lvl < unlockLevel(id, 'backtrace') ? `Lv ${unlockLevel(id, 'backtrace')}` : 'trace'}</span><b>Backtrace</b><span class="trule">${esc(BACKTRACE[id].rule)}</span></li>
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
  const shown = hiddenNodes(s).filter(hiddenVisible);
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
  const taken = Object.keys(l.state.taken).length, total = takeable(l).length;
  if (s.run?.loc === l.id) return 'here';
  if (taken >= total) return 'done';
  if (taken || l.runs) return 'partial';
  return 'new';
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
  return `<text x="${p.x}" y="${p.y}" class="mlabel ${cls}" text-anchor="${p.a}">${esc(name)}</text><text x="${p.x}" y="${p.y + 16}" class="msub" text-anchor="${p.a}"><tspan class="mlv ${conClass(gap)}">${level}</tspan>${depth > 1 ? `<tspan class="mlayer" dx="6">L${depth}</tspan>` : ''}${rest ? `<tspan dx="6">${esc(rest)}</tspan>` : ''}</text>`;
};
// A thin progress arc around a node (share 0–1).
const arc = (r, share, cls) => { const c = 2 * Math.PI * r; return `<circle r="${r}" class="marc-bg ${cls}"/><circle r="${r}" class="marc ${cls}" stroke-dasharray="${(c * Math.min(1, share)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90)"/>`; };

export function mapMarkup(s, sel = 'server', view = 'mine', { side = true } = {}) {
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
  const rings = con ? [{ r: RM, t: 'trunk', cls: 'trunk' }] : [{ r: 120, t: 'wall', cls: 'wall' }, ...Array.from({ length: deepest }, (_, i) => ({ r: R1 + i * R2, t: `L${i + 1}` }))];
  const scope = `<g class="mscope">${rings.map((g) => `<circle r="${g.r}" class="mring-range ${g.cls || ''}"/><text text-anchor="start" x="${Math.round(g.r * 0.72) + 4}" y="${-Math.round(g.r * 0.69) - 4}" class="mring-label">${g.t}</text>`).join('')}
    <line x1="${minX}" y1="0" x2="${maxX}" y2="0" class="maxis"/><line x1="0" y1="${minY}" x2="0" y2="${maxY}" class="maxis"/></g>`;
  const lines = links.map((k) => {
    const a2 = find(k.from), b2 = find(k.to);
    return `<line x1="${a2.x}" y1="${a2.y}" x2="${b2.x}" y2="${b2.y}" class="mlink ${k.hot ? 'hot' : ''} ${k.ghost ? 'ghost' : ''} ${k.trunk ? 'trunk' : ''}"/>`;
  }).join('');
  const draw = nodes.map((n) => {
    const on = n.id === sel ? ' selected' : '';
    const pick = on ? reticle(n.kind === 'server' ? 13 : 9) : '';
    if (n.kind === 'server') {
      const srv = s.server;
      return `<g class="mnode server${on}" data-select="server" tabindex="0" role="button" aria-label="Your server"><circle r="26" class="mhit"/><circle r="24" class="halo"/><rect x="-10" y="-10" width="20" height="20" rx="2"/><rect x="-3" y="-3" width="6" height="6" class="inner"/>${pick}<text y="38" class="mlabel home" text-anchor="middle">HOME · LV ${serverLevel(s)}</text><text y="53" class="msub" text-anchor="middle">${srv.integrity}/${srv.max}</text></g>`;
    }
    if (n.kind === 'zone') {
      const live = liveSpawns(s), here = s.run?.loc === CONFIG.zone.id;
      return `<g class="mnode zone${here ? ' here' : ''}${dropOf(s.zone) ? ' drop' : ''}${on}" data-select="${CONFIG.zone.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${CONFIG.zone.name}, rogue server"><circle r="18" class="mhit"/><path d="M0 -9 L8 -4.5 L8 4.5 L0 9 L-8 4.5 L-8 -4.5 Z"/>${live ? `<circle r="2.5" class="zdot"/>` : ''}${dropMark(s.zone)}${pick}${label(n, 10, CONFIG.zone.name, (here ? 'you are here' : live ? `rogue server · ${live} hostile` : 'rogue server · quiet') + (simOn(s) && inSprawl(s).length ? ` · ${inSprawl(s).length} online` : ''))}</g>`;
    }
    if (n.kind === 'roamer') {
      const r = n.roamer, ang = Math.atan2(n.ty - n.y, n.tx - n.x) * 180 / Math.PI;
      return `<g class="mnode invader travel${on}" data-select="roamer" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Invasion on the trunk line: ${esc(r.name)}"><circle r="18" class="mhit"/><path d="M7 0 L-5 -5 L-2 0 L-5 5 Z" transform="rotate(${Math.round(ang)})"/>${pick}${label({ ...n, angle: undefined }, 7, r.name, `lv ${r.level} · hop ${r.hop} · ${fmtLeft(r.left)}`, 'hot')}</g>`;
    }
    if (n.kind === 'member') {
      const raid = consortiumOf(s).raid?.member === n.handle, down = rebooting(s, n.handle);
      const sieges = serversOf(s, n.handle).filter((l) => l.held?.siege).length + (raid ? 1 : 0);
      return `<g class="mnode member${n.online ? ' online' : ''}${sieges ? ' besieged' : ''}${on}" data-select="${esc(n.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(n.handle)}'s home server"><circle r="18" class="mhit"/><rect x="-7" y="-7" width="14" height="14" rx="2"/>${n.online ? '<circle r="2.5" class="zdot"/>' : ''}${pick}${label(n, 10, n.handle, `lv ${memberLevel(s, n.handle)} · ${serversOf(s, n.handle).length} ${serversOf(s, n.handle).length === 1 ? 'server' : 'servers'}${raid ? ' · invasion at the wall' : down ? ' · crashed' : sieges ? ' · invasion' : ''}`)}</g>`;
    }
    if (n.kind === 'intrusion') {
      return `<g class="mnode intrusion${on}" data-select="intrusion" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Intrusion ${esc(n.virus.name)}"><circle r="18" class="mhit"/><circle r="8" class="pulse"/><path d="M0 -6 L6 0 L0 6 L-6 0 Z"/>${pick}${label(n, 8, n.virus.name, n.fighting ? 'fighting' : `lv ${n.virus.level} · at the gate`, 'hot')}</g>`;
    }
    if (n.kind === 'invader') {
      const inv = n.inv, sub = s.degraded && inv.state !== 'travel' ? 'waiting' : inv.state === 'travel' ? `${fmtLeft(inv.left)} out` : inv.state === 'siege' ? `contested ${Math.round(inv.hp * 100)}%` : 'breach';
      const ang = Math.atan2(-n.y, -n.x) * 180 / Math.PI; // it points at home
      return `<g class="mnode invader ${inv.state}${on}" data-select="invader" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Invasion: ${esc(inv.name)}"><circle r="18" class="mhit"/><path d="M7 0 L-5 -5 L-2 0 L-5 5 Z" transform="rotate(${Math.round(ang)})"/>${pick}${label({ ...n, angle: undefined }, 7, inv.name, sub, inv.state === 'breach' ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'fleet') {
      const f = n.fleet, ang = Math.atan2(n.ty - n.y, n.tx - n.x) * 180 / Math.PI;
      const sub = f.state === 'travel' ? `${fmtLeft(fleetLeft(s))} out` : `at it · ${fmtLeft(f.siegeLeft)}`;
      const ships = Array.from({ length: f.total }, (_, i) => `<path d="M5 0 L-4 -3.5 L-2 0 L-4 3.5 Z" class="${i < f.ships ? '' : 'gone'}" transform="translate(${(i % 2) * -7 - Math.floor(i / 2) * 3} ${(i - (f.total - 1) / 2) * 6})"/>`).join('');
      return `<g class="mnode fleet ${f.state}${on}"${f.faction ? ` style="--fc:${FX[f.faction].color}" data-faction="${f.faction}"` : ''} data-select="fleet" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Swarm of ${f.ships}"><circle r="18" class="mhit"/><g transform="rotate(${Math.round(ang)})">${ships}</g>${pick}${label(n, 10, `Swarm ×${f.ships}`, f.faction ? `${FX[f.faction].short} · ${sub}` : sub, f.state === 'siege' ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'hub') {
      const f = n.hub.faction, F = FX[f], t = repTier(s, f);
      return `<g class="mnode hub${hostile(s, f) ? ' hostile' : ''}${offline(s, f) ? ' offline' : ''}${captured(s, f) ? ' yours' : ''}${lockedDown(s, f) || retakeOf(s)?.f === f ? ' threat' : ''}${on}" style="--fc:${captured(s, f) ? 'var(--you)' : F.color}" data-select="${esc(n.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(F.name)} hub"><circle r="18" class="mhit"/><path d="M0 -13 L13 0 L0 13 L-13 0 Z" class="hub-frame"/><g class="hub-mark" transform="translate(-8 -8)">${GLYPHS['f-' + f]}</g>${pick}${label(n, 14, F.short, lockedDown(s, f) ? 'lockdown' : retakeOf(s)?.f === f ? `swarm · ${fmtLeft(retakeLeft(s))}` : offline(s, f) ? 'hub · offline' : captured(s, f) ? 'your hub' : `hub · ${t.name}`, lockedDown(s, f) || retakeOf(s)?.f === f ? 'hot' : '')}</g>`;
    }
    if (n.kind === 'hidden') {
      const h = n.hidden, flag = hiddenFlagged(s, h);
      return `<g class="mnode hidden${flag ? ' job' : ''}${on}" data-select="${h.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="Unknown server"><circle r="18" class="mhit"/>${arc(8, h.lead / 100, 'lead')}<text class="qmark" text-anchor="middle" y="4">?</text>${pick}${label(n, 9, flag ? 'Flagged' : 'Unknown', `${h.lead ? h.lead + '% traced' : 'pinged'}`, 'dim')}</g>`;
    }
    if (n.kind === 'lead') {
      return `<g class="mnode lead${on}" data-select="${n.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(FAMILIES[n.family].name)} lead"><circle r="18" class="mhit"/>${arc(8, n.progress / 100, 'lead')}${pick}${label(n, 9, `${FAMILIES[n.family].name} lead`, `${Math.min(99, n.progress)}%`, 'dim')}</g>`;
    }
    const l = n.loc, st = nodeState(s, l);
    const taken = Object.keys(l.state.taken).length, total = takeable(l).length;
    const job = openContracts(s).some((c) => c.loc === l.id);
    const rest = st === 'here' ? 'here' : l.held?.siege ? 'invasion' : l.held?.lockdown ? 'lockdown' : l.held ? l.held.kind : job ? 'contract' : l.outpost?.lockdown ? 'lockdown' : l.outpost?.siege ? 'invasion' : l.outpost?.h ? gauge(stockOf(l), capOf(l)) : l.takenOver ? 'yours' : st === 'done' ? 'clean' : '';
    const op = l.outpost?.h ? (l.outpost.lockdown ? ' locked' : l.outpost.siege || (s.fleet?.target === l.id && s.fleet.state === 'siege') ? ' besieged' : ' outpost') : l.held ? (l.held.siege ? ' besieged' : l.held.lockdown ? ' locked' : ' outpost') : '';
    if (l.rogue) {
      const live = Object.values(l.spawns || {}).filter((x) => x.alive).length;
      return `<g class="mnode rogue${st === 'here' ? ' here' : ''}${s.locations.includes(l) && !isLive(s, l) ? ' detached' : ''}${on}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(l.name)}, rogue server"><circle r="18" class="mhit"/><path d="M0 -10 L9 -5 L9 5 L0 10 L-9 5 L-9 -5 Z"/><path d="M-4 -3 L4 3 M4 -3 L-4 3" class="rx"/>${pick}${lvLabel(s, n, 12, l.name, l.level || 1, l.depth || 1, l.occupied ? `rebooting · ${live}` : `${ROGUE.kinds[l.rogue.kind].name.toLowerCase()}${st === 'here' ? ' · here' : live ? ` · ${live} hostile` : ''}`)}</g>`;
    }
    return `<g ${l.faction ? `style="--fc:${FX[l.faction].color}" ` : ''}class="mnode loc ${st}${l.faction ? ' fowned' : ''}${l.takenOver ? ' owned' : ''}${s.locations.includes(l) && !isLive(s, l) ? ' detached' : ''}${op}${job ? ' job' : ''}${dropOf(l) ? ' drop' : ''}${on}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(l.name)}"><circle r="18" class="mhit"/>${l.outpost?.h ? `<title>${esc(l.name)} · stockpile ${stockOf(l)}/${capOf(l)}</title>` : ''}${st === 'new' ? '<circle r="11" class="ring"/>' : arc(10, total ? taken / total : 0, st)}<circle r="5" class="core"/>${l.faction ? `<g class="fmark" transform="translate(9 -17) scale(0.62)">${GLYPHS['f-' + l.faction]}</g>` : ''}${dropMark(l)}${pick}${lvLabel(s, n, 12, l.name, l.level || 1, l.depth || 1, rest)}</g>`;
  }).join('');
  const hoverNames = s.settings?.mapNames === 'hover';
  const svg = `<svg class="map-svg${hoverNames ? ' names-hover' : ''}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" data-vb="${minX} ${minY} ${maxX - minX} ${maxY - minY}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of your server and traced locations">${scope}${lines}${draw}</svg>`;
  // Top corner: which map, and the map's own controls (names on hover, zoom back out).
  const tabs = `<div class="map-tools">${consortiumOf(s) ? `<div class="map-tabs comms-filters" role="group" aria-label="Show"><button type="button" data-mapview="mine" aria-pressed="${!con}">Your network</button><button type="button" data-mapview="consortium" aria-pressed="${con}">${esc(consortiumOf(s).name)}</button></div>` : ''}<div class="map-ctl comms-filters"><button type="button" data-run="map names ${hoverNames ? 'on' : 'hover'}" aria-pressed="${!hoverNames}" title="${hoverNames ? 'Names show on hover: click to always show them' : 'Show names only on hover'}">Aa</button><button type="button" data-map-zoom="reset" title="Zoom back out (double-click the map too). Scroll to zoom, drag to pan.">⤢</button></div></div>`;
  return `<div class="map-page${side ? '' : ' no-side'}"><section class="panel map-canvas">${tabs}${svg}</section>${side ? `<aside class="map-side">${mapSide(s, sel, find(sel))}</aside>` : ''}</div>`;
}
// The map's selection card on its own (the sidebar carries it when it's on).
export function mapSelection(s, sel = 'server', view = 'mine') {
  const con = !!consortiumOf(s) && (view === 'consortium' || sel === 'roamer' || sel.startsWith('member-') || memberServers(s).some((l) => l.id === sel));
  const { nodes } = con ? consortiumLayout(s) : mapLayout(s);
  const node = nodes.find((n) => n.id === sel) || nodes.find((n) => n.id === 'server');
  return mapSide(s, node?.id || 'server', node);
}

// Server level: shared by everyone on the server. Defending it and banking loot raise it.
function serverCard(s) {
  const p = serverProgress(s);
  const opens = p.next && SERVER.daemonSlotsAt.includes(p.level + 1) ? ['a daemon slot'] : [];
  return `<div class="lvl-row" title="The server gets every point of XP your classes earn"><span class="lvl-badge">Server Lv ${p.level}</span>${p.next ? `<span class="lvl-bar"><span style="width:${(p.xp / p.next) * 100}%"></span></span><small>${p.xp}/${p.next} XP</small>` : '<small>max level</small>'}</div>`;
}

// A numbers-station dead drop (station.mjs): a mark on the map node, and the broadcast on its card.
const dropMark = (l) => (dropOf(l) ? '<g class="dropmark" transform="translate(12 -12) scale(1.4)"><path d="M0 4 L0 -3 M-3 -5 Q0 -8 3 -5 M-5 -7 Q0 -12 5 -7"/></g>' : '');
function dropLine(s, l) {
  const d = dropOf(l);
  if (!d) return '';
  return `<p class="svc-line drop-line"><span class="tag tag-drop" title="Closes in ${dropMinutes(l)} min">Dead drop · ${dropMinutes(l)} min</span> <code>${spell(d.pass.replace(/\d+$/, ''))} · ${d.pass.slice(-2)}</code></p>`;
}

// In a consortium, your wall meets invaders while you're logged off: what it stops.
function awayLine(s) {
  if (!consortiumOf(s)) return '';
  if (s.degraded) return '<p class="svc-line"><span class="tag warn" title="No wall until it\'s back up">Rebooting</span></p>';
  const b = wallBands(s, wallRating(s) * archWall(s) * consortiumWall(s));
  const top = Math.max(0, ...(s.locations || []).filter((l) => !l.rogue).map((l) => l.level || 1));
  const safe = top && b.blocks >= top;
  return `<div class="srv-wall" title="While you're logged off, invasions keep coming at half pace and your wall meets them (consortium bonus included). A crash reboots your server for ${CONSORTIUM.rebootMs / 3600000} hours.${top ? ` Your servers send up to level ${top}.` : ''}"><span class="srv-k ${safe ? '' : 'warn'}">${glyph('clock')}Away</span>${wallRuler(s, true, b)}</div>`;
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
  const why = active(s) ? 'Finish the fight first' : s.run ? 'Jack out first' : relockLeft(s.zone) ? `Reconnect in ${relockLeft(s.zone)}s` : sig < need ? `Signal too weak: rest to ${need}` : '';
  return `<section class="card zone-card"><h2>Rogue server</h2><h1>${CONFIG.zone.name}</h1>
    <div class="stats">${stat('Hostiles', `${liveSpawns(s)}/${zoneRooms().length}`)}</div>
    ${dropLine(s, s.zone)}
    <div class="row">${here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${CONFIG.zone.id}" ${why ? `disabled title="${esc(why)}"` : ''}>Connect</button>`}${why && !here ? `<small class="svc-line">${esc(why)}</small>` : ''}</div></section>`;
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
        ${serverCard(s)}
        <div class="srv-hp ${srv.integrity / srv.max <= 0.3 ? 'low' : srv.integrity / srv.max <= 0.6 ? 'mid' : ''}" title="Integrity">${glyph('integrity')}<span class="srv-bar"><span style="width:${(srv.integrity / srv.max) * 100}%"></span></span><b>${srv.integrity}</b><small>/${srv.max}</small></div>
        <div class="srv-chips"><span title="Credits">${glyph('credits')}<b>${srv.credits}</b></span><span title="Salvage">${glyph('salvage')}<b>${s.salvage.length}</b></span><span title="Servers you've found">${glyph('trace')}<b>${s.locations.length}</b></span></div>
        ${degradedMarkup(s)}
        <div class="srv-wall"><span class="srv-k" title="Your wall: which invasion levels it stops">${glyph('firewall')}Wall</span>${wallRuler(s, true)}</div>
        ${awayLine(s)}
        <div class="srv-slots">${slotPips('memory', liveCount(s), memoryCap(s), 'Memory: servers on your network')}${slotPips('node', portsUsed(s), portCount(s), 'Service slots')}${slotPips('harvester', bandwidthUsed(s), bandwidth(s), 'Harvester slots')}</div>
        ${s.install ? `<div class="install mini"><div class="install-top"><b>${glyph(s.install.id)}${esc(SERVICES[s.install.id].name)} v${s.install.v}</b><span>${fmtTime(s.install.doneAt - Date.now())}</span></div><div class="install-bar"><span style="width:${Math.min(100, Math.max(0, ((Date.now() - s.install.startedAt) / (s.install.doneAt - s.install.startedAt)) * 100))}%"></span></div>${buyoutBtn(s, 'buyout', installBuyout(s))}</div>` : ''}
        ${s.invasion ? `<div class="invader-line ${s.invasion.state}"><b>${esc(s.invasion.name)}</b>${levelTag(s, s.invasion.level)}<span>${esc(invaderShort(s))}</span></div>${s.invasion.state !== 'travel' ? `<div class="row">${jackInButton(invaderStatus(s))}</div>` : ''}` : ''}
        ${rackMarkup(s)}
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
    const why = active(s) ? 'Finish the fight first' : s.run ? 'Jack out first' : sig < need ? `Signal too weak: rest to ${need}` : '';
    return `${alertCard()}<section class="card"><h2>Rogue server</h2><h1>${CONFIG.zone.name}</h1>
      <div class="stats">${stat('Hostiles', `${liveSpawns(s)}/${zoneRooms().length}`)}${stat('Signal', `${here ? s.run.integrity : sig}/${max}`)}</div>
      <div class="row">${here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${CONFIG.zone.id}" ${why ? `disabled title="${esc(why)}"` : ''}>Connect</button>`}</div></section>`;
  }
  if (node.kind === 'intrusion') return alertCard();
  if (node.kind === 'invader') return wallMarkup(s);
  if (node.kind === 'fleet') return fleetCard(s);
  if (node.kind === 'hidden') {
    const h = node.hidden, via = s.locations.find((x) => x.id === h.via), flag = hiddenFlagged(s, h), kit = kitOf(s);
    const job = openContracts(s).find((c) => c.hidden === h.id && !c.loc);
    return `<section class="card${flag ? ' alert' : ''}"><h2>Unknown server · layer ${h.depth}</h2><h1>?</h1>
      <p class="svc-line">past ${esc(via?.name || '?')} · signal <span class="sigbars">${'▮'.repeat(h.signal)}${'▯'.repeat(5 - h.signal)}</span></p>
      ${flag && job ? `<p class="svc-line"><span class="tag">Contract</span> ${esc(contractTitle(s, job))}</p>` : ''}
      <div class="lvl-row"><span class="lvl-bar"><span style="width:${h.lead}%"></span></span><small>${h.lead}% traced</small></div>
      ${kit.injector ? `<div class="row"><button type="button" class="btn" data-command="use injector ${h.id}">Trace injector (${kit.injector})</button></div>` : ''}</section>`;
  }
  if (node.kind === 'lead') {
    const f = FAMILIES[node.family];
    return `<section class="card"><h2>Lead</h2><h1>${esc(f.name)} · ${node.progress}%</h1><div class="lvl-row"><span class="lvl-bar"><span style="width:${Math.min(100, node.progress)}%"></span></span></div></section>`;
  }
  const l = node.loc, st = nodeState(s, l);
  // Memory (memory.mjs): a detached server is frozen; its card is just that and Attach.
  if (s.locations.includes(l) && !isLive(s, l)) {
    const up = l.detached ? null : (() => { let p = l; while (p && !p.detached) p = s.locations.find((x) => x.id === p.parent); return p; })();
    return `<section class="card mem-card"><h2>${l.depth > 1 ? `Layer ${l.depth}` : 'Origin'} · detached</h2><h1>${esc(l.name)}</h1>
      <p>${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)}${l.outpost?.h ? ` · ${glyph(l.outpost.h.kind)}outpost frozen at ${stockOf(l)}/${capOf(l)}` : ''}</p>
      <div class="srv-slots">${slotPips('memory', liveCount(s), memoryCap(s), 'Memory: servers on your network')}</div>
      <div class="row">${up ? `<button type="button" class="btn" data-select="${esc(up.id)}">${esc(up.name)} is detached</button>` : `<button type="button" class="btn primary" data-command="attach ${esc(l.id)}" ${busy || s.server.credits < memoryCost(l) || liveCount(s) >= memoryCap(s) ? 'disabled' : ''} title="${liveCount(s) >= memoryCap(s) ? 'Memory is full: detach another server first' : 'Back on your network, as it was'}">${glyph('credits')}Attach · ${memoryCost(l)}</button>`}</div></section>`;
  }
  if (l.occupied) {
    const live = Object.values(rogueSpawns(s, l)).filter((x) => x.alive).length;
    return `<section class="card alert"><h2>${l.member ? `${esc(l.member)}'s server` : 'Your server'} · rebooting</h2><h1>${esc(l.name)}</h1>
      <p>${levelTag(s, l.level || 1)} ${esc(FAMILIES[l.family].name)} · occupied</p>
      <div class="stats">${stat('Processes', `${live}/${rogueRooms(l).length}`)}${stat('Back up in', fmtTime(l.member ? l.occupied.left : degradedLeft(s)))}</div>
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
      <div class="row">${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relockLeft(l) ? `disabled title="Still tracing your last connection"` : ''}>Connect</button>`}${!l.member && !l.trunk && s.locations.includes(l) ? `<button type="button" class="btn small mem-x" data-command="detach ${esc(l.id)}" data-confirm="Detach ${esc(l.name)}? It freezes as it is (and what you found through it) until you attach it again." ${busy || s.server.credits < memoryCost(l) ? 'disabled' : ''} title="Free a memory slot. Frozen until you attach it again.">${glyph('memory')}Detach · ${memoryCost(l)}</button>` : ''}${st !== 'here' && relockLeft(l) ? `<small class="svc-line">Reconnect in ${relockLeft(l)}s</small>` : ''}</div></section>`;
  }
  const layout = layoutName(l);
  const guard = Object.keys(l.state.cleared).length ? 'guard beaten' : 'guarded';
  const taken = Object.keys(l.state.taken).length, total = takeable(l).length;
  const parent = l.parent && s.locations.find((x) => x.id === l.parent);
  return `<section class="card ${st === 'new' ? 'alert' : ''}"><h2>${l.member ? `${esc(l.member)}'s server` : l.depth > 1 ? `Layer ${l.depth}` : 'Origin'} · ${esc(FAMILIES[l.family].name)}</h2><h1>${esc(l.name)}</h1>
    <p>${levelTag(s, l.level || 1)} · ${esc(layout)}${siteLabel(l) ? ` <span class="tag tag-site" title="${esc(siteLabel(l).rule)}">${esc(siteLabel(l).name)}</span>` : ''}${QUIRKS[l.quirk] ? ` <span class="tag tag-quirk" data-quirk="${l.quirk}" title="${esc(QUIRKS[l.quirk].rule)}">${esc(QUIRKS[l.quirk].name)}</span>` : ''}</p>
    <div class="stats">${stat('Files', `${taken}/${total}`)}${l.takenOver ? stat('Server', 'Yours') : stat('Guard', Object.keys(l.state.cleared).length ? 'beaten' : 'up')}${stat('Runs', l.runs || 0)}</div>
    ${openContracts(s).filter((c) => c.loc === l.id).map((c) => `<p class="svc-line"><span class="tag${c.offBooks ? ' hot' : ''}">Contract</span> ${esc(contractTitle(s, c))}</p>`).join('')}
    ${parent ? `<p class="svc-line">via ${esc(parent.name)}</p>` : ''}
    ${l.passwordKnown ? `<p class="svc-line">key <code>${esc(l.password)}</code></p>` : ''}
    ${l.relay ? '<p class="svc-line"><span class="tag you">Relay up</span></p>' : ''}
    ${consortiumLine(s, l)}
    ${l.faction ? `<p class="svc-line fline" style="--fc:${FX[l.faction].color}">${fIcon(l.faction)}<b>${esc(FX[l.faction].short)}</b> runs it · opening its vault takes it: ${esc(FX[l.faction].short)} −${OWNED.takeoverHit}${FX[l.faction].rivals.length ? `, ${FX[l.faction].rivals.map((r) => esc(FX[r].short)).join(' and ')} +${Math.round(OWNED.takeoverHit * 0.5)}` : ''}</p>` : ''}
    ${dropLine(s, l)}
    ${outpostCard(s, l)}
    <div class="row">${l.takenOver && !l.relay ? `<button type="button" class="btn" data-command="relay ${esc(l.id)}" ${kitOf(s).relay ? '' : 'disabled title="You have no relay. Halcyon sells them."'}>Install relay${kitOf(s).relay ? ` (${kitOf(s).relay})` : ''}</button>` : ''}${!l.takenOver && !l.member && !l.passwordKnown && kitOf(s).cracker ? `<button type="button" class="btn" data-command="use cracker ${esc(l.id)}">Key cracker (${kitOf(s).cracker})</button>` : ''}${st === 'here' ? btn('net', 'Back to the run', true) : `<button type="button" class="btn ${st !== 'done' ? 'primary' : ''}" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : ''}>Connect</button>`}${!l.member && !l.trunk && s.locations.includes(l) ? `<button type="button" class="btn small mem-x" data-command="detach ${esc(l.id)}" data-confirm="Detach ${esc(l.name)}? It freezes as it is (and what you found through it) until you attach it again." ${busy || s.server.credits < memoryCost(l) ? 'disabled' : ''} title="Free a memory slot. Frozen until you attach it again.">${glyph('memory')}Detach · ${memoryCost(l)}</button>` : ''}</div></section>`;
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
function modsMarkup(s, l) {
  const mine = modsOf(l), ports = outpostPorts(s), busy = active(s) || s.run;
  const credits = archCredits(s, OUTPOST.modCost.credits), code = OUTPOST.modCost.code, k = codeOf(l.family), have = materialsOf(s)[k] || 0, scrap = canAfford(s, SALVAGE_COSTS.module());
  const on = mine.map((id) => `<span class="mod on" title="${esc(OUTPOST.mods[id].rule)}">${glyph(id)}${esc(OUTPOST.mods[id].name)}<button type="button" class="mod-x" data-command="outpost unmod ${esc(l.id)} ${id}" ${busy ? 'disabled' : ''} title="Remove it: half its code comes back" aria-label="Remove ${esc(OUTPOST.mods[id].name)}">×</button></span>`).join('');
  const free = mine.length < ports ? Object.keys(OUTPOST.mods).filter((id) => !mine.includes(id)).map((id) => `<button type="button" class="mod add" data-command="outpost mod ${esc(l.id)} ${id}" ${busy || s.server.credits < credits || have < code || !scrap ? 'disabled' : ''} title="${esc(`${OUTPOST.mods[id].rule} ${credits} credits, ${code} ${MATERIALS[k].name} and ${OUTPOST.modCost.salvage} salvage.`)}">${glyph(id)}${esc(OUTPOST.mods[id].name)}</button>`).join('') : '';
  return `<div class="mods">${slotPips('module', mine.length, ports, 'Module slots')}${on}${free}</div>`;
}

// The outpost part of a location card: install, stockpile, siege, retake and repair.
function outpostCard(s, l) {
  if (!l.takenOver) return '';
  return outpostCore(s, l) + modsMarkup(s, l);
}
function outpostCore(s, l) {
  const o = l.outpost || {}, busy = active(s) || s.run;
  const why = busy ? 'disabled title="Finish what you are doing first"' : '';
  if (!o.h) {
    const rack = harvesters(s);
    if (o.readyAt && Date.now() < o.readyAt) return `<p class="svc-line">Harvester slot resetting · ${fmtTime(o.readyAt - Date.now())} ${buyoutBtn(s, `outpost buyout ${l.id}`, outpostBuyout(l)?.price)}</p>`;
    if (!rack.length) return '';
    const full = l.trait !== 'backbone' && bandwidthUsed(s) >= bandwidth(s);
    return `<div class="outpost"><p class="svc-line">${slotPips('harvester', bandwidthUsed(s), bandwidth(s), 'Harvester slots')}</p><div class="row">${rack.map((h, i) => `<button type="button" class="btn" data-command="outpost install ${esc(l.id)} ${i + 1}" ${full ? 'disabled title="No harvester slot free. Pull a harvester out, or level your server."' : `title="${esc(OUTPOST.kinds[h.kind].about)}"`}>Install ${esc(harvesterName(h))}</button>`).join('')}</div></div>`;
  }
  const h = o.h, m = MATERIALS[codeOf(l.family)];
  const traits = h.traits.map((t) => `<span class="tag" title="${esc(OUTPOST.traits[t].rule)}">${esc(OUTPOST.traits[t].name)}</span>`).join(' ');
  const head = `<p class="svc-line"><span class="tag you">Outpost</span> <span title="${esc(OUTPOST.kinds[h.kind].about)}">${glyph(h.kind)}${esc(OUTPOST.kinds[h.kind].name)} lv${h.level}</span> ${traits}</p>`;
  if (o.lockdown) return `<div class="outpost lost">${head}<p class="svc-line"><span class="tag hot" title="No harvesting until it ends. The stockpile is kept, and the server stays open.">Lockdown</span> ${fmtTime(o.lockdown.left)} left · ${stockOf(l)}/${capOf(l)} kept</p><div class="row"><button type="button" class="btn primary" data-command="outpost retake ${esc(l.id)}" ${why}>Retake</button>${buyoutBtn(s, `outpost buyout ${l.id}`, outpostBuyout(l)?.price)}</div></div>`;
  // The stockpile: how full, how much, how fast. Connect to collect.
  const fill = `<div class="lvl-row" title="${h.kind === 'scraper' ? 'Loot rolls waiting' : esc(m.name) + ' waiting'}. Connect to collect."><span class="lvl-bar"><span style="width:${(100 * (o.stock || 0)) / capOf(l)}%"></span></span><small>${stockOf(l)}/${capOf(l)} · ${Math.round(perHour(l, l.outpost.h, s) * 10) / 10}/h</small></div>`;
  // Threats on the outpost, each in its own box: what, how many/long (a bar), one button.
  const opBox = (kind, title, info, pct, btnHtml) => `<div class="op-box ${kind}"><div class="op-top"><span class="tag ${kind === 'infest' ? 'warn' : 'hot'}">${title}</span><small>${info}</small></div>${pct == null ? '' : `<div class="op-bar"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`}<div class="row">${btnHtml}</div></div>`;
  const fl = s.fleet && s.fleet.target === l.id ? opBox('swarm', s.fleet.faction ? `Swarm from ${esc(FX[s.fleet.faction].short)}` : 'Swarm', `${s.fleet.ships} ${esc(FAMILIES[s.fleet.family].name.toLowerCase())} · ${s.fleet.state === 'travel' ? `arrives in ${fmtLeft(fleetLeft(s))}` : `falls in ${fmtLeft(s.fleet.siegeLeft)}`}`, null, `<button type="button" class="btn primary" data-command="swarm engage" ${why}>${s.fleet.state === 'travel' ? 'Intercept' : 'Defend'}</button>`) : '';
  const siege = o.siege ? opBox('siege', 'Invasion', `falls in ${fmtTime(o.siege.left)} of play`, (o.siege.left / OUTPOST.siegeMs) * 100, `<button type="button" class="btn primary" data-command="outpost defend ${esc(l.id)}" ${why}>Defend</button>`) : '';
  const inf = o.infest ? opBox('infest', 'Infested', `${o.infest.count}/${o.infest.total} left · ${fmtTime(o.infest.left)}`, (o.infest.left / INFEST.stayMs) * 100, `<button type="button" class="btn primary" data-command="outpost clear ${esc(l.id)}" ${why} title="Clear them for an hour of production at once. Ignore them and they move on.">Clear</button>`) : '';
  return `<div class="outpost${o.siege || fl ? ' besieged' : ''}">${head}${fill}${fl}${siege}${inf}${o.siege ? '' : `<div class="row"><button type="button" class="btn" data-command="outpost pull ${esc(l.id)}" title="Take the harvester back, with what it holds. The slot then resets for ${OUTPOST.resetMs / 60000} minutes.">Pull out</button></div>`}</div>`;
}


// The harvester rack on the server card.
function rackMarkup(s) {
  const rack = harvesters(s), used = bandwidthUsed(s), bw = bandwidth(s);
  if (!rack.length && !used && !s.locations.some((l) => l.takenOver)) return '';
  // Harvester slots are pips just above; this is the rack: what's packed and waiting to go out.
  return rack.length ? `<div class="rack"><p class="svc-line" title="Harvester rack: ${rack.length} of ${OUTPOST.stashCap}">${glyph('crate')}${rack.map((h) => `<span class="tag">${glyph(h.kind)}${esc(harvesterName(h))}</span>`).join(' ')}</p></div>` : '';
}

const layoutName = (l) => ({ relay: 'Relay node', mailhub: 'Mail hub', mirror: 'Public mirror', archive: 'Backup archive', lab: 'Research lab' })[l.template] || 'Node';

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
    <div class="row sound-test"><span class="next-label">Sound test</span>${[['hit', 'Hit'], ['break', 'Break'], ['hurt', 'Hurt'], ['unlock', 'Unlock'], ['pickup', 'Pickup'], ['good', 'Good news'], ['win', 'Win / level'], ['chit', 'Armor chit'], ['patch', 'Patch'], ['interrupt', 'Interrupt'], ['nope', 'Refused'], ['prewarn', 'Warning'], ['daemon', 'Daemon'], ['channel', 'Channel change'], ['jackin', 'Connect'], ['hangup', 'Hang up'], ['lose', 'Crash'], ['mark', 'Mark'], ['burn', 'Burn'], ['helper', 'Helper'], ['shield', 'Shield'], ['buff', 'Buff']].map(([id, name]) => `<button type="button" class="btn" data-sound="${id}">${name}</button>`).join('')}</div></section>
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
    else if (e.type === 'level-up') add(`Level ${e.level}`, '', 'level', { sub: e.unlocked?.length ? 'New skill unlocked' : 'Power +4%' });
    else if (e.type === 'server-level') add(`Server level ${e.level}`, '', 'level');
    else if (e.type === 'code' && e.gains) for (const [m, n] of Object.entries(e.gains)) add(MATERIALS[m]?.name || m, `+${n}`, m === 'exploit' ? 'exploit' : 'code', { pack: !!e.pack, text: `+${n} ${MATERIALS[m]?.name || m}` });
    else if (e.type === 'drop') {
      const what = e.item ? itemLabel(e.item) : e.daemon || /daemon/i.test(e.message || '') ? 'Daemon' : e.recipe || /blueprint/i.test(e.message || '') ? 'Blueprint' : 'Drop';
      const kind = e.item ? 'item' : what === 'Daemon' ? 'daemon' : what === 'Blueprint' ? 'blueprint' : 'item';
      add(what, '', kind, { pack: !!e.pack, rarity: e.item?.rarity, sub: e.item ? statLine(e.item.stats) : '' });
    } else if (e.type === 'lead') { const m = e.message.match(/(\w+) lead \+(\d+)% \((\d+)%\)/); add(m ? `${m[1]} lead` : 'Lead', m ? `+${m[2]}%` : '', 'lead', { text: m ? `${m[1]} lead +${m[2]}%` : 'Lead', pct: m ? Math.min(100, +m[3]) : null, from: m ? Math.max(0, +m[3] - +m[2]) : null }); }
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
  return `<ul class="salvage-stacks">${st.map((x) => `<li class="${x.component ? 'comp' : ''}" title="${esc(x.component ? `${x.name}: counts as any salvage, and some recipes ask for it by name.` : `${x.name}: counts as any salvage.`)}">${glyph('salvage')}<b>${x.n}</b>${esc(x.name)}</li>`).join('')}</ul>`;
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
  craft: (s) => [...(s.recipes || []), ...(s.configsKnown || []).map((c) => 'cfg:' + c)],
  daemons: (s) => Object.entries(s.daemonsOwned || {}).map(([id, v]) => `${id}:${v}`),
};
export function newOn(s, tab) {
  if (!NEW_TABS[tab]) return 0;
  if (!s.seen) { s.seen = {}; for (const t of Object.keys(NEW_TABS)) s.seen[t] = NEW_TABS[t](s); }
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
export function sidebarMarkup(s, { module = 'map', mapSel = 'server', mapView = 'mine', preview = null } = {}) {
  const fighting = active(s), e = s.encounter;
  // The crew: live in a run fight, else as they'll join you.
  const mates = matesOf(s), inFight = fighting && e.mode === 'run';
  const fc = inFight ? forecast(s, preview) : null;
  const actedWho = inFight ? e.steps?.order?.[e.steps.next - 1] : null; // whose turn just played
  const crew = mates.length
    ? `<section class="sb-block sb-crew"><div class="sb-head"><b>${inFight ? 'Party' : 'Crew'}</b><small>${mates.length}/3</small></div><div class="party">${mates.map((m) => {
        const live = inFight && m.encounter, up = !live || mateUp(m), pct = (m.run.integrity / m.run.max) * 100, q = live ? m.encounter.queue : null;
        // What they mean to do this cycle: the skill (its verb's colour and icon) and the part.
        const a = q && ABILITIES[q.ability], tgt = q?.target && part(s, q.target);
        const intent = !live ? '' : !up ? '<div class="pm-intent dim">down</div>' : a ? `<div class="pm-intent verb-${a.verb}" title="${esc(a.help || a.short || '')}">${glyph(a.verb)}<b>${esc(a.name)}</b>${tgt ? `<span class="pm-at">→ ${esc(tgt.name)}</span>` : ''}${q.last ? '<small>last</small>' : ''}</div>` : '<div class="pm-intent dim">holding</div>';
        return `<div class="pmate${up ? '' : ' down'}${m.who === actedWho ? ' acting' : ''}" data-mate="${esc(m.who)}"><b>${esc(m.who)}</b><small class="pm-cls">${esc(ARCHETYPES[m.loadout.archetype].name)}</small>${live && up && drawingFire(m) ? '<span class="tag hot pm-tag">drawing fire</span>' : ''}<span class="pbar"><span style="width:${pct}%"></span>${fc ? lossMark(m.run.integrity, m.run.max, fc.mates[m.who] || 0) : ''}</span><small>${up ? `${m.run.integrity}/${m.run.max}` : 'down'}</small>${intent}</div>`;
      }).join('')}</div></section>`
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
  if (captured(s, f)) return [{ key: 'hold', label: 'Your hub', meta: `${glyph('credits')}${bankOf(s, f)}` }, { key: 'market', label: 'Market', meta: `⇄ ${Math.round(travelMs(s, f) / 60000)}m` }];
  if (hostile(s, f)) return [pay, ...(f !== 'halcyon' ? [{ key: 'donate', label: 'Donate', meta: donationOf(s, f).x > 1 ? `×${donationOf(s, f).x.toFixed(1)}` : '' }] : []), servers];
  if (offline(s, f, now)) return [pay, servers];
  return [
    { key: 'market', label: 'Market', meta: `⇄ ${Math.round(travelMs(s, f) / 60000)}m` },
    ...(f === 'halcyon' ? [{ key: 'store', label: 'Store', meta: 'instant' }] : []),
    { key: 'work', label: 'Work', meta: `${offers}` },
    pay,
    ...(f !== 'halcyon' && donationOf(s, f).open ? [{ key: 'donate', label: 'Donate', meta: donationOf(s, f).x > 1 ? `×${donationOf(s, f).x.toFixed(1)}` : '' }] : []),
    servers,
  ];
}
function goodsMarkup(s, f, now) {
  const F = FX[f];
  if (f === 'halcyon' || hostile(s, f) || offline(s, f, now)) return '';
  return `<h3 class="craft-sub">Goods</h3><ul class="craft-list">${shopOf(s, f, now).map((g) => `<li class="${g.locked ? 'locked' : ''}"><span class="mk-ware"><b class="iname" title="${esc(g.about)}">${glyph(g.id === 'tip' ? 'f-lantern' : GLYPH_OF_GOOD[g.id] || 'crate', 'badge')}${esc(g.name)}</b><span class="mk-have${g.left ? '' : ' zero'}" title="In stock">×${g.left}</span></span>${g.locked ? `<span class="tag dim">${esc(F.tiers[g.need])}</span>` : `<button type="button" class="btn ${s.server.credits >= g.price && g.left ? 'primary' : ''} small" data-command="buy ${f} ${g.id}" ${s.server.credits >= g.price && g.left ? '' : 'disabled'}>${glyph('credits')}${g.price}</button>`}</li>`).join('')}</ul>`;
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
  market: { title: 'Market', body: (s, f, now) => marketMarkup(s, f, now) + goodsMarkup(s, f, now) },
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
  const w = W ? `<section class="card hub-win"><h2${W.tip ? ` title="${esc(W.tip(f))}"` : ''}>${esc(W.title)}<button type="button" class="btn small x" data-hub-opt="" title="Close">×</button></h2>${W.body(s, f, now)}</section>` : '';
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
  return earn + threat;
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
  return `${head}${held ? `<ul class="craft-list">${held}</ul>` : ''}${fly}${lastLine}<h3 class="craft-sub">Compile${full ? ` · ${PAYLOAD.maxBuilt}/${PAYLOAD.maxBuilt}` : ''}</h3><ul class="craft-list">${make}</ul>`;
}
// The hub's market: what it pays and asks for each ware, why (hover the arrow), and your transfers.
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
    const chip = `<span class="mk-d ${d >= 3 ? 'up' : d <= -3 ? 'down' : 'flat'}" title="Against the ${Math.round(avg)}-credit average across hubs${why ? ` · ${esc(why)}` : ''}">${d >= 3 ? '▲' : d <= -3 ? '▼' : '='}${Math.abs(d)}%</span>`;
    const sellBtn = (k) => `<button type="button" class="btn small ${n >= k ? 'primary' : ''}" data-command="market sell ${f} ${w} ${k}" ${n >= k && k ? '' : 'disabled'} title="+${q.sell * k} · ${min} min">Sell ${k}</button>`;
    const buyBtn = `<button type="button" class="btn small" data-command="market buy ${f} ${w} 1" ${s.server.credits >= q.buy ? '' : 'disabled'} title="Buy 1 · ${min} min">Buy ${glyph('credits')}${q.buy}</button>`;
    return `<li class="mk-row"><span class="mk-ware"><b class="iname">${glyph(GLYPH_OF_GOOD[w], 'badge')}${esc(WARES[w].name)}</b><span class="mk-have${n ? '' : ' zero'}" title="You have ${n}">×${n}</span></span><span class="mk-val" title="What it pays here, each">${glyph('credits')}<b>${q.sell}</b>${chip}</span><span class="mk-btns">${sellBtn(1)}${lot > 1 ? sellBtn(lot) : ''}${buyBtn}</span></li>`;
  }).join('');
  const mine = transfersOf(s).filter((x) => x.f === f);
  const flying = mine.length ? `<h3 class="craft-sub">In transfer</h3><ul class="craft-list">${mine.map((x) => { const left = Math.max(0, x.landsAt - now), pct = Math.round((1 - left / Math.max(1, x.landsAt - x.sentAt)) * 100); return `<li class="mk-xfer"><span class="mk-ware"><b class="iname">${x.side === 'sell' ? '→' : '←'} ${x.side === 'good' ? `${glyph(GLYPH_OF_GOOD[x.good] || 'crate', 'badge')}${esc(x.name)}` : `${glyph(GLYPH_OF_GOOD[x.w], 'badge')}×${x.n}`}</b></span><span class="mk-val ${x.side === 'sell' ? 'in' : 'out'}">${glyph('credits')}<b>${x.side === 'sell' ? '+' : '−'}${x.credits}</b></span><span class="xfer-bar" title="${Math.max(1, Math.ceil(left / 60000))} min"><i style="width:${pct}%"></i></span></li>`; }).join('')}</ul>` : '';
  return `<div class="row mk-tags"><span class="tag" title="${esc(cond.about)}">${esc(cond.name)}</span><span class="tag dim" title="${esc(ev.about)}">${esc(ev.name)}</span><span class="tag dim" title="File transfer">⇄ ${min} min</span></div><ul class="craft-list">${rows}</ul>${flying}`;
}
const GLYPH_OF_GOOD = { relay: 'relay', cracker: 'cracker', injector: 'injector', signal: 'signal', repair: 'repair', cipher: 'cipher', worm: 'worm', kernel: 'kernel', exploit: 'exploit', salvage: 'salvage', crate: 'crate', blueprint: 'blueprint', daemon: 'daemon' };

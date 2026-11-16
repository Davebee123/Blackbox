// Loadout → Skills and talents: the class page (docs/class-page.md), and the Toolkit.
//
// The page is one card of the whole class in three columns: subclass A · the class · subclass B. The class in the
// middle: its emblem, name, roles and status; its four core abilities; its passive, sync bonus and kit talent. Each
// subclass: its icon, name and roles; its edge; its eleven abilities; its talent tree. No rule text on the page:
// every ability, talent, edge and passive says what it does in its tooltip (WoW grammar, docs/style-guide.md).
// An ability on a key carries the key as a teal badge.
//
// Its states: below SUBCLASS.from both subclasses are dimmed hard and marked Level 10. From it with no pick (a class
// then plays its core alone, combat.mjs subOf) both are lit with a Choose on each. Once picked, yours is wide and
// marked Yours, the other folded to a greyed strip with Switch. The tree is spent on the page: a click on a node runs
// the same `talent` command as typing it (right-click takes a rank back).
//
// The Toolkit (key T, the page's button): an overlay with the class's core and cantrips on the left page, the
// subclass's line on the right, and the bar along its foot with the preset chips. app.js drags an ability onto a key
// (`equip <class> <skill> <key>`; one on another key swaps), off a key to clear it (`unequip`), or taps one then a key.
//
// The first time you're home at SUBCLASS.from with no pick, app.js brings you to this page once (subPromptDue,
// combat.mjs subPrompted).
import { ABILITIES, ARCHETYPES, LOADOUT, SUBCLASS, SUBS, SYNC, CONFIG, STATUSES, TREE, barSlots, cantripsOf, isRunSkill, lineOf, unlockLevel, xpToNext } from './data.mjs';
import { active, capPickOf, capState, capstonePoints, classOf, cooldownOf, equippedSkills, followOf, freeTiers, hackerLevel, hackerOf, kitTalent, knownSkills, picked, presetKeys, presetsOf, specRule, subOf, subWaiting, tiersOf, tierState } from './combat.mjs';
import { glyph } from './glyphs.mjs';
import { SKILL_TEXT } from './lore.mjs';
import { EMBLEMS } from './class-emblems.mjs';
import { scaledText } from './view.mjs';
import { masterable, progressOf, masteryLine } from './mastery.mjs';

const fmt = (n) => Number(n).toLocaleString('en-GB');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ico = (name) => `<span class="sk-ico" style="--icon:url('ui/icons/${name}.svg')" aria-hidden="true"></span>`;
const skIco = (id) => ico(ABILITIES[id]?.icon || (id === 'spike' ? 'spike' : id === 'sigint' ? 'interrupt' : 'command'));
const subIco = (id) => ico(`sub-${id}`);
const pips = (n, max) => `<span class="sk-pips" aria-label="${n} of ${max}">${Array.from({ length: max }, (_, k) => `<i${k < n ? ' class="on"' : ''}></i>`).join('')}</span>`;
const KIND = { hit: 'Hit', burn: 'Burn', stun: 'Stun', debuff: 'Debuff', shield: 'Shield', heal: 'Heal', buff: 'Buff' };
// Lit skills (Shatter, Retaliate, Opening) have no cooldown: they're usable just after their moment.
const LIT = new Set(['shatter', 'retaliate', 'opening']);
const roles = (x) => `<span class="cls-roles">${x.role.map((r) => `<span class="cls-role">${esc(r)}</span>`).join('')}</span>`;
// A tooltip: "Name: what it does" (app.js ttShow bolds the name), its kind line, and its state lines ("tone|text").
const tip = (name, body, kind, state = []) => ` title="${esc(`${name}: ${body}`)}"${kind ? ` data-tt-kind="${esc(kind)}"` : ''}${state.filter(Boolean).length ? ` data-tt-state="${esc(state.filter(Boolean).map(([t, x]) => `${t}|${x}`).join('\n'))}"` : ''}`;

// ---------- what the page shows ----------
function pageOf(s, view) {
  const vc = String(view || '').split('/')[0];
  const equippedArch = classOf(s), id = ARCHETYPES[vc] ? vc : equippedArch, a = ARCHETYPES[id];
  const lvl = hackerLevel(s, id), mine = subOf(s, id); // null below SUBCLASS.from, and until a pick
  return {
    s, id, a, equippedArch, mine, kit: SUBS[mine] || null, lvl, hk: hackerOf(s, id),
    busy: active(s) || !!s.run, keysBusy: active(s), // talents and subclasses change at home, keys anywhere out of a fight
    known: knownSkills(s, id), equipped: equippedSkills(s, id), slots: barSlots(lvl),
    early: lvl < SUBCLASS.from, waiting: subWaiting(s, id),
  };
}
const skillName = (id) => ABILITIES[id]?.name || Object.values(ARCHETYPES).flatMap((a) => a.skills).find((x) => x.id === id)?.name || id;
const skillText = (s, id, arch) => scaledText(s, id, SKILL_TEXT[id]?.desc || ABILITIES[id]?.desc || ABILITIES[id]?.short || ARCHETYPES[arch].skills.find((x) => x.id === id)?.rule || '', arch);
const syncRule = (id) => `Fired in a Sync Window, your command deals ${Math.round(CONFIG.sync.bonus * 100)}% more damage and ${SYNC[id].rule.replace(/^./, (c) => c.toLowerCase())}`;
// An ability's kind line, like WoW's "Instant · 8 sec cooldown".
function kindOf(p, x) {
  const ab = ABILITIES[x];
  if (isRunSkill(x)) return 'Run skill · Takes no key';
  if (!ab) return 'Utility';
  const n = p.id === classOf(p.s) ? cooldownOf(p.s, x) : ab.cooldown || 0;
  return `${KIND[ab.verb] || 'Utility'} · ${ab.once ? 'Once per fight' : LIT.has(x) ? 'Usable after its moment' : n ? `${n} cycle cooldown` : 'No cooldown'}`;
}
// An ability's tooltip: its rule and mastery, its kind, and what holds (its key, the level it opens).
function abilityTip(p, x, { at, own, cantrip }) {
  const key = cantrip ? cantripsOf(p.id).find((c) => c.id === x)?.key : LOADOUT.keys[p.equipped.indexOf(x)];
  const text = cantrip ? cantripsOf(p.id).find((c) => c.id === x).rule : skillText(p.s, x, p.id);
  const ml = own && masterable(x, p.id) ? masteryLine(p.s, p.id, x) : '';
  const state = [own && key && ['you', `On key ${key}.`], !own && at > p.lvl && ['muted', `Unlocks at level ${at}.`]];
  return tip(cantrip ? cantripsOf(p.id).find((c) => c.id === x).name : skillName(x), `${text}${ml ? '\n' + ml : ''}`, kindOf(p, x), state);
}
// A tile on the page: the icon, the name, the key it's on (teal), the level it opens at while locked.
function tile(p, x, sub, mineLine) {
  const at = unlockLevel(p.id, x, sub), own = mineLine && p.known.includes(x), k = own ? p.equipped.indexOf(x) : -1;
  const cls = own ? 'on' : mineLine ? 'lock' : 'peek';
  const badge = k >= 0 ? `<span class="cls-k">${LOADOUT.keys[k]}</span>` : '';
  const lv = !own && at > p.lvl ? `<span class="cls-at">${at}</span>` : '';
  const inner = `<span class="cls-fr">${skIco(x)}${lv}</span>${badge}<b>${esc(skillName(x))}</b>`;
  return own ? `<button type="button" class="cls-ab ${cls}" data-toolkit="${p.id}"${abilityTip(p, x, { at, own })}>${inner}</button>`
    : `<span class="cls-ab ${cls}" tabindex="0"${abilityTip(p, x, { at, own })}>${inner}</span>`;
}

// ---------- the tree ----------
// A node's state: picked or not, whether a click picks it, and whether its row is still locked.
function nodeState(p, n, row, j) {
  const { s, id } = p, ro = p.busy;
  if (row.kind === 'tier') {
    const ts = tierState(s, id, row.tier), on = ts === 'picked' && tiersOf(s, id)[row.tier] === j;
    return { on, can: !ro && ts !== 'locked' && !on, cls: on ? 'pick' : ts === 'locked' ? 'locked' : '' };
  }
  const pk = capPickOf(s, id), cs = picked(pk) ? 'picked' : capState(s, id);
  const on = pk === j, other = cs === 'picked' && !on, r = on ? Math.min(n.max, capstonePoints(s, id)) : 0;
  return { on, other, r, max: n.max, cs, can: !ro && (cs === 'open' || other), cls: on ? 'pick' : cs === 'locked' ? 'locked' : '' };
}
// A node's tooltip: its name, its kind and what it does. A capstone adds its second rank and what holds it.
function nodeTip(p, n, row, st, alt, live) {
  if (row.kind === 'tier') return tip(n.name, n.rule, `Tier ${row.tier + 1} talent`);
  const body = `${n.rules[0]}\nAt rank ${n.max} (level ${LOADOUT.capstoneAt[n.max - 1]}): ${n.rules[n.max - 1]}`;
  const or = alt ? `\n${st?.on ? 'Instead of' : 'Or'} ${alt.name}.` : '';
  const kind = `Capstone · Level ${LOADOUT.capstoneAt[0]}`;
  if (!live) return tip(n.name, body + or, kind);
  const why = p.keysBusy ? 'Between fights.' : p.busy ? 'At home.' : st.cs === 'locked' ? `Opens at level ${LOADOUT.capstoneAt[0]}.` : '';
  return tip(n.name, body + or + (st.can ? `\n▸ Click to ${st.other ? 'swap to it' : 'pick it'}.` : ''), kind, [st.on && ['you', 'Picked.'], why && ['muted', why]]);
}
// The tree: six rows of three, the picked one lit, a locked row's level at its start; the capstone row's two under them.
// live: yours, to pick from.
function treeHtml(p, k, live) {
  const rows = TREE.map((row) => {
    const nodes = row.kind === 'tier' ? k.tiers[row.tier] : k.capstones || [];
    const node = (n, j) => {
      const st = live ? nodeState(p, n, row, j) : null;
      const tail = row.kind === 'capstone' ? pips(st?.r || 0, n.max) : '';
      const cmd = live && st.can ? ` data-command="${row.kind === 'tier' ? `talent ${p.id} ${row.tier + 1} ${'abc'[j]}` : `talent ${p.id} capstone ${j ? 'b' : 'a'}`}"` : '';
      const cls = `cls-tn${st?.cls ? ' ' + st.cls : ''}${row.kind === 'capstone' ? ' cap' : ''}${cmd ? ' can' : ''}`;
      return live ? `<button type="button" class="${cls}" data-tn="${esc(n.id)}"${cmd}${cmd ? '' : ' aria-disabled="true"'}${nodeTip(p, n, row, st, nodes[1 - j], true)}><b>${esc(n.name)}</b>${tail}</button>`
        : `<span class="${cls}" tabindex="0" data-tn="${esc(n.id)}"${nodeTip(p, n, row, st, nodes[1 - j], false)}><b>${esc(n.name)}</b>${tail}</span>`;
    };
    if (row.kind === 'capstone') return `<div class="cls-row cap">${node(nodes[0], 0)}<span class="cls-or">or</span>${node(nodes[1], 1)}</div>`;
    const lv = live && p.lvl < row.level ? `<span class="cls-tl">${row.level}</span>` : '';
    return `<div class="cls-row t3">${lv}${nodes.map(node).join('')}</div>`;
  }).join('');
  return `<div class="cls-tree">${rows}</div>`;
}

// ---------- the columns ----------
const edgeHtml = (k) => `<div class="cls-root cls-edge" tabindex="0"${tip(k.edge.name, k.edge.rule, `Edge · Level ${SUBCLASS.from}`)}>${glyph('spike')}<div><small>Edge</small><b>${esc(k.edge.name)}</b></div></div>`;
// A subclass, whole: early (dimmed, Level 10), to choose, or yours.
function subCol(p, k) {
  const mine = p.mine === k.id;
  const act = p.early ? '<span class="cls-lv10">Level 10</span>'
    : mine ? '<span class="cls-yours">Yours</span>'
    : `<button type="button" class="btn primary" ${p.keysBusy ? 'disabled title="Between fights"' : `data-command="subclass ${p.id} ${k.id}"`}>Choose</button>`;
  return `<section class="cls-col cls-sub${p.early ? ' off' : ''}${mine ? ' mine' : ''}" data-sub="${k.id}">
    <div class="cls-ch"><span class="cls-mk">${subIco(k.id)}</span><div><h2>${esc(k.name)}</h2>${roles(k)}</div>${act}</div>
    ${edgeHtml(k)}
    <div class="cls-abil">${lineOf(k).map((x) => tile(p, x.id, k.id, mine)).join('')}</div>
    ${treeHtml(p, k, mine)}</section>`;
}
// The other subclass once you've picked: a greyed strip with Switch.
function foldCol(p, k) {
  const why = p.keysBusy ? 'Between fights' : p.busy ? 'At home' : null;
  return `<aside class="cls-fold" data-sub="${k.id}"><span class="cls-mk">${subIco(k.id)}</span><h2>${esc(k.name)}</h2>${roles(k)}
    <p class="cls-fedge" tabindex="0"${tip(k.edge.name, k.edge.rule, `Edge · Level ${SUBCLASS.from}`)}>Edge · ${esc(k.edge.name)}</p>
    <div class="cls-icons">${lineOf(k).map((x) => `<span${tip(skillName(x.id), skillText(p.s, x.id, p.id), kindOf(p, x.id))}>${skIco(x.id)}</span>`).join('')}</div>
    <button type="button" class="btn" ${why ? `disabled title="${why}"` : `data-command="subclass ${p.id} ${k.id}"`}>Switch</button></aside>`;
}
function midCol(p) {
  const { id, a, s, lvl } = p, st = STATUSES[a.status], kit = kitTalent(id), kitOpen = lvl >= LOADOUT.specFrom;
  const root = (icon, label, name, body, kind, locked) => `<div class="cls-root${locked ? ' locked' : ''}" tabindex="0"${tip(name, body, kind, [locked && ['muted', `Unlocks at level ${LOADOUT.specFrom}.`]])}>${glyph(icon)}<div><small>${label}${locked ? ` · Lv ${LOADOUT.specFrom}` : ''}</small><b>${esc(name)}</b></div></div>`;
  return `<section class="cls-col cls-mid">
    <div class="cls-id"><pre class="sk-emblem" aria-hidden="true">${esc(EMBLEMS[id].join('\n'))}</pre><h2>${esc(a.name)}</h2>
      <span class="cls-roles">${a.role.map((r) => `<span class="cls-role">${esc(r)}</span>`).join('')}<span class="tag stag status sk-status" title="${esc(`${st.name}: ${st.rule}`)}">${esc(st.name)}</span></span></div>
    <div class="cls-abil core">${a.core.map((x) => tile(p, x, null, true)).join('')}</div>
    <div class="cls-roots">${root('damage', 'Passive', a.passive.name, a.passive.rule, 'Passive')}${root('sync', 'Sync', 'Sync bonus', syncRule(id), 'Sync bonus')}${root('crit', 'Kit talent', kit.name, specRule(kit), `Kit talent · Level ${LOADOUT.specFrom}`, !kitOpen)}</div>
  </section>`;
}

export function skillsTabMarkup(s, view) {
  const p = pageOf(s, view), { id, a, kit, lvl, hk } = p, [A, B] = Object.values(a.subs);
  const next = xpToNext(lvl), pct = lvl < LOADOUT.maxLevel ? Math.max(0, Math.min(100, (hk.xp / next) * 100)) : 100;
  const free = kit ? freeTiers(s, id) : LOADOUT.tiers.filter((l) => lvl >= l).length, spent = kit ? tiersOf(s, id).some(picked) || picked(capPickOf(s, id)) : false;
  const pts = free && !p.early ? `<span class="cls-pts" title="${esc(`Talent tiers: A tier opens at each of levels ${LOADOUT.tiers.slice(0, -1).join(', ')} and ${LOADOUT.tiers.at(-1)}. Pick one of its three talents.`)}"><b>${free}</b> ${free === 1 ? 'tier to pick' : 'tiers to pick'}</span>` : '';
  const reset = spent && !p.busy ? `<button type="button" class="btn small" data-command="talent reset ${id}" title="Reset: takes back every pick. Free at home.">Reset</button>` : '';
  const top = `<header class="cls-top"><div class="cls-lv"><b>Lv ${lvl}</b>${lvl < LOADOUT.maxLevel ? `<span class="cls-xp" title="${fmt(hk.xp)} / ${fmt(next)} XP"><i style="width:${pct.toFixed(1)}%"></i></span>` : '<small>max level</small>'}</div><span class="cls-sp"></span>${pts}${reset}<button type="button" class="btn cls-toolkit" data-toolkit="${id}" title="Toolkit: Your abilities and your bar. Drag an ability onto a key.">${ico('command')}Toolkit<kbd>T</kbd></button></header>`;
  const ban = p.early ? `<p class="cls-ban dim">Subclass at level ${SUBCLASS.from}</p>` : p.waiting ? '<p class="cls-ban">Choose a subclass</p>' : '';
  const yours = kit, other = kit ? (kit.id === A.id ? B : A) : null;
  const cols = yours ? `${subCol(p, yours)}${midCol(p)}${foldCol(p, other)}` : `${subCol(p, A)}${midCol(p)}${subCol(p, B)}`;
  return `<div class="cls">${top}${ban}<div class="cls-card${yours ? ' reg' : ''}${p.early ? ' early' : ''}">${cols}</div></div>`;
}

// The page's own prompt: the first time the class in use is past SUBCLASS.from with no pick, you're home and out of a
// fight. Once a class (s.loadout.subLater); app.js also waits for the screen to be free.
export const subPromptDue = (s) => subWaiting(s) && !s.loadout?.subLater?.[classOf(s)] && !active(s) && !s.run;

// ---------- the Toolkit ----------
// ui.pick: an ability picked by a tap ({ id, from: a key's index or null }), lit until a key takes it.
export function toolkitMarkup(s, view, ui = {}) {
  const p = pageOf(s, view), { id, a, kit } = p, pick = ui.pick || null, frozen = p.keysBusy;
  const entry = (x, sub, cantrip) => {
    const at = cantrip ? unlockLevel(id, x) : unlockLevel(id, x, sub), own = cantrip ? at <= p.lvl : p.known.includes(x);
    const key = cantrip ? cantripsOf(id).find((c) => c.id === x).key : own ? LOADOUT.keys[p.equipped.indexOf(x)] : undefined;
    const name = cantrip ? cantripsOf(id).find((c) => c.id === x).name : skillName(x);
    const moves = own && !cantrip && !isRunSkill(x) && !frozen;
    const m = own && masterable(x, id) ? progressOf(s, id, x) : null;
    const tiers = m && m.tier > 1 ? `<span class="tk-mt" role="group" aria-label="Its effect plays at">${[1, 2, 3].map((t) => { const open = t <= m.tier, on = t === m.pick; return `<button type="button" class="tk-tier${on ? ' on' : open ? '' : ' locked'}" ${open && !on ? `data-command="mastery ${id} ${x} ${t}"` : 'disabled'} aria-pressed="${on}" title="${esc(!open ? `Tier ${t}: at ${m.at[t]} uses.` : on ? `Tier ${t}: its effect plays at this tier.` : `Tier ${t}: play its effect at this tier.`)}">${t}</button>`; }).join('')}</span>` : '';
    const sub2 = own ? kindOf(p, x) : `Level ${at}`;
    const body = `<span class="tk-fr">${skIco(x)}${key ? `<span class="cls-k">${key}</span>` : ''}</span><b>${esc(name)}</b><small>${esc(sub2)}</small>`;
    const t = abilityTip(p, x, { at, own, cantrip });
    return `<div class="tk-i${own ? '' : ' lock'}${pick?.id === x ? ' picked' : ''}">${moves ? `<button type="button" class="tk-b" data-tk-skill="${x}" draggable="true"${t}>${body}</button>` : `<span class="tk-b" tabindex="0"${t}>${body}</span>`}${tiers}</div>`;
  };
  const left = `<div class="tk-pg"><p class="tk-kick">${esc(a.name)}</p><div class="tk-list">${a.core.map((x) => entry(x, null)).join('')}${cantripsOf(id).map((c) => entry(c.id, null, true)).join('')}</div></div>`;
  const right = `<div class="tk-pg"><p class="tk-kick">${kit ? esc(kit.name) : 'Subclass'}</p>${kit ? `<div class="tk-list">${lineOf(kit).map((x) => entry(x.id, kit.id)).join('')}</div>` : `<p class="tk-none">${p.early ? `Level ${SUBCLASS.from}` : 'Choose a subclass'}</p>`}</div>`;
  // The bar: key 1, the keys (closed ones say when they open), then SIGINT.
  const cant = (c) => { const at = unlockLevel(id, c.id); return `<li class="tk-slot cant${at > p.lvl ? ' closed' : ''}"${at > p.lvl ? ` title="${esc(`${c.name}: unlocks at level ${at}.`)}"` : ''}><kbd>${c.key}</kbd>${at > p.lvl ? `<small>Lv ${at}</small>` : skIco(c.id)}</li>`; };
  const keys = Array.from({ length: LOADOUT.equipSlots }, (_, i) => {
    const k = LOADOUT.keys[i];
    if (i >= p.slots) { const opens = LOADOUT.bar.find(([, n]) => n > i)?.[0] ?? 1; return `<li class="tk-slot closed" title="${esc(`Key ${k}: opens at level ${opens}.`)}"><kbd>${k}</kbd><small>Lv ${opens}</small></li>`; }
    const x = p.equipped[i], lit = pick && pick.from === i;
    return x ? `<li class="tk-slot${lit ? ' picked' : ''}" data-tk-key="${k}" data-tk-skill="${x}"${frozen ? '' : ' draggable="true"'}${abilityTip(p, x, { at: 0, own: true })}><kbd>${k}</kbd>${skIco(x)}</li>`
      : `<li class="tk-slot empty" data-tk-key="${k}"><kbd>${k}</kbd></li>`;
  }).join('');
  const cs = cantripsOf(id);
  const bar = `<ol class="tk-slots${pick ? ' armed' : ''}" aria-label="Your bar">${cant(cs[0])}${keys}${cs.slice(1).map(cant).join('')}</ol>`;
  let presets = '';
  if (id === p.equippedArch && kit) {
    const all = presetsOf(s, id), on = followOf(s, id);
    presets = `<div class="tk-presets">${Object.keys(all).map((n) => `<button type="button" class="tk-chip${n === on ? ' on' : ''}" ${frozen || n === on ? 'disabled' : `data-command="loadout use ${esc(n)}"`} aria-pressed="${n === on}" title="${esc(`${n}: ${(presetKeys(s, id, n) || []).map((x, i) => `${LOADOUT.keys[i]} ${skillName(x)}`).join(' · ')}`)}">${esc(n)}</button>`).join('')}<button type="button" class="tk-chip" data-prefill="loadout save " ${frozen ? 'disabled' : ''} title="Save: keeps this bar under a name.">+ save</button></div>`;
  }
  const foot = frozen ? '<span class="tk-busy">Between fights</span>' : presets;
  return `<div class="tk-scrim" data-tk-close></div><section class="tk" role="dialog" aria-modal="true" aria-label="Toolkit">
    <header class="tk-h">${ico('command')}<h2>Toolkit</h2><span class="tk-cls">${esc(a.name)} · Lv ${p.lvl}</span><button type="button" class="tk-x" data-tk-close aria-label="Close">×</button></header>
    <div class="tk-spread">${left}${right}</div>
    <footer class="tk-dock"><span class="tk-kick">Bar</span>${bar}${foot}</footer></section>`;
}

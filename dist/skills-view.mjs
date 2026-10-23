// Loadout → Skills and talents, and the subclass breakout (the designer's direction C, proto/skills-c.html).
//
// The page is one card and a detail panel. The card is names, icons and state, nothing to read: the class emblem with
// the class, subclass, level and XP; then Bar (your keys, the presets, save bar), Skills (chips by line: the core, then
// the subclass's) and Talents (passive, sync, kit talent and edge; the tree as compact name chips with rank pips, its
// points). Pick, hover or focus anything and the panel beside it says what it does: the full rule (ruleHtml's key facts
// in white: the only place on the page they're lit), cooldown, key, level, kind, the other side of an OR choice, what
// it works with, and its buttons (equip, a key to put it on, a rank, a pick). On a phone the panel is a bottom sheet.
//
// No subclass shows before SUBCLASS.from. From it a class that hasn't picked plays its core alone (combat.mjs subOf),
// and the breakout waits: a full-screen walk inside the screen's glass (Idea, Skills, Talents, Choose) with both
// subclasses side by side and the detail panel for anything in it. app.js opens it once you're home and out of a fight
// (breakoutDue), "Later" puts it off (combat.mjs subLater), and the page keeps a "Choose your subclass" button for it.
//
// Item keys (data-sk): s:<skill>, k:<cantrip>, r:<passive|sync|kit|edge>, t:<talent node> on the page; in the breakout
// b:<subclass>:<skill>, bt:<subclass>:<node> and be:<subclass> (its edge).
import { ABILITIES, ARCHETYPES, CONFIG, LOADOUT, SUBCLASS, SUBS, SYNC, STATUSES, TREE, barSlots, cantripsOf, isRunSkill, lineOf, presetBar, shippedPresets, skillOrder, unlockLevel, xpToNext } from './data.mjs';
import { active, canTakeBack, capPickOf, capState, capstonePoints, classOf, cooldownOf, equippedSkills, followOf, hackerLevel, hackerOf, kitTalent, knownSkills, picksOf, pointsSpent, presetKeys, presetsOf, ranksOf, rowState, spentAbove, specRule, subOf, subWaiting, talentPoints, tierState } from './combat.mjs';
import { glyph } from './glyphs.mjs';
import { ruleHtml } from './ruletext.mjs';
import { SKILL_TEXT } from './lore.mjs';
import { EMBLEMS } from './class-emblems.mjs';
import { scaledText } from './view.mjs';

const fmt = (n) => Number(n).toLocaleString('en-GB');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ico = (name) => `<span class="sk-ico" style="--icon:url('ui/icons/${name}.svg')" aria-hidden="true"></span>`;
const skIco = (id) => ico(ABILITIES[id]?.icon || (id === 'spike' ? 'spike' : id === 'sigint' ? 'interrupt' : 'command'));
const pips = (n, max) => `<span class="sk-pips" aria-label="${n} of ${max}">${Array.from({ length: max }, (_, k) => `<i${k < n ? ' class="on"' : ''}></i>`).join('')}</span>`;
const sel = (key, on) => `data-sk="${esc(key)}" aria-pressed="${on}"`;
const picked = (x) => x === 0 || x === 1;
const TREE_MAX = TREE.reduce((n, r) => n + (r.kind === 'choice' ? 1 : r.kind === 'capstone' ? 0 : 6), 0); // the capstone row has its own points
const VERB = { hit: 'hit', burn: 'burn', stun: 'stun', debuff: 'debuff', shield: 'shield', heal: 'heal', buff: 'buff', util: 'utility', run: 'run' };
const ROOT = { passive: ['Passive', 'damage'], sync: ['Sync', 'sync'], kit: ['Kit talent', 'crit'], edge: ['Edge', 'spike'] };
// Lit skills (Shatter, Retaliate, Opening) have no cooldown: they're usable just after their moment.
const LIT = new Set(['shatter', 'retaliate', 'opening']);
const SUB_ICON = { demolitionist: 'expand', overclocker: 'overload', warden: 'shell-shield', sysop: 'clear', payload: 'injector', phantom: 'weakness', herder: 'command', hijacker: 'behavior' };

// ---------- what the page shows ----------
// view: a class, or class/subclass (class/core: the class alone). Only a class that picked can look at a subclass:
// its own, or the other as a preview (read-only, with Switch). Below SUBCLASS.from, and until you pick, the class alone.
function pageOf(s, view) {
  const [vc, vs] = String(view || '').split('/');
  const equippedArch = classOf(s), id = ARCHETYPES[vc] ? vc : equippedArch, a = ARCHETYPES[id];
  const mine = subOf(s, id); // null below SUBCLASS.from, and until a pick
  const shown = !mine || vs === 'core' ? null : SUBS[vs]?.cls === id ? vs : mine;
  const kit = SUBS[shown] || null, previewing = !!kit && shown !== mine;
  const lvl = hackerLevel(s, id);
  return {
    s, id, a, equippedArch, mine, shown, kit, previewing, lvl, hk: hackerOf(s, id),
    busy: active(s) || !!s.run, keysBusy: active(s), // talents and classes change at home, keys anywhere out of a fight
    known: knownSkills(s, id), equipped: equippedSkills(s, id), slots: barSlots(lvl),
    waiting: subWaiting(s, id),
  };
}
const skillName = (id) => ABILITIES[id]?.name || Object.values(ARCHETYPES).flatMap((a) => a.skills).find((x) => x.id === id)?.name || id;
const skillText = (s, id, arch) => scaledText(s, id, SKILL_TEXT[id]?.desc || ABILITIES[id]?.desc || ABILITIES[id]?.short || ARCHETYPES[arch].skills.find((x) => x.id === id)?.rule || '', arch);
const syncRule = (id) => `Fired in a Sync Window, your command deals ${Math.round(CONFIG.sync.bonus * 100)}% more damage and ${SYNC[id].rule.replace(/^./, (c) => c.toLowerCase())}`;

// Everything on the page you can pick, by key: { kind, name, text, ... }.
function itemsOf(p) {
  const { s, id, a, kit } = p, out = new Map();
  // The skills on show (the core and the shown line), and your keys (on another view they are still yours).
  for (const x of skillOrder(id, p.shown)) out.set('s:' + x, { kind: 'skill', id: x, name: skillName(x), text: skillText(s, x, id), core: a.core.includes(x), sub: a.core.includes(x) ? null : p.shown });
  for (const x of p.equipped) if (!out.has('s:' + x)) out.set('s:' + x, { kind: 'skill', id: x, name: skillName(x), text: skillText(s, x, id), core: false, sub: p.mine });
  for (const c of cantripsOf(id)) out.set('k:' + c.id, { kind: 'cantrip', id: c.id, name: c.name, text: c.rule });
  out.set('r:passive', { kind: 'root', root: 'passive', name: a.passive.name, text: a.passive.rule });
  out.set('r:sync', { kind: 'root', root: 'sync', name: 'Sync bonus', text: syncRule(id) });
  out.set('r:kit', { kind: 'root', root: 'kit', name: kitTalent(id).name, text: specRule(kitTalent(id)), level: LOADOUT.specFrom });
  if (kit) {
    out.set('r:edge', { kind: 'root', root: 'edge', name: kit.edge.name, text: kit.edge.rule, level: SUBCLASS.from });
    treeNodes(kit, (n, row, i, j, alt) => out.set('t:' + n.id, { kind: row.kind, node: n, row, i, j, alt, name: n.name, text: n.rules?.[0] || n.rule }));
  }
  return out;
}
// Every node of a subclass's tree, top to bottom: fn(node, row, rowIndex, side, the other side).
function treeNodes(kit, fn) {
  TREE.forEach((row, i) => {
    const nodes = row.kind === 'filler' ? kit.fillers[row.row] : row.kind === 'choice' ? kit.talents[row.tier] : kit.capstones || [];
    nodes.forEach((n, j) => fn(n, row, i, j, nodes[1 - j]));
  });
}
// What works with it (derived from the real text): talents and skills that name it, and the skills it names.
const mentions = (text, name) => !!text && !!name && new RegExp(`(^|[^\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(text);
function withOf(items, key) {
  const it = items.get(key), out = [];
  if (!it) return out;
  for (const [k, o] of items) {
    if (k === key || o.kind === 'cantrip') continue;
    if ((it.kind === 'skill' && mentions(o.text, it.name)) || (o.kind === 'skill' && mentions(it.text, o.name))) out.push(k);
  }
  return out.slice(0, 5);
}

// ---------- the card ----------
function keyHtml(p, i, sk) {
  const key = LOADOUT.keys[i], opens = LOADOUT.bar.find(([, n]) => n > i)?.[0] ?? 1;
  if (i >= p.slots) return `<li class="sk-key closed" title="${esc(`This slot opens at level ${opens}`)}"><kbd>${key}</kbd><b>Lv ${opens}</b></li>`;
  const x = p.equipped[i];
  if (x) return `<li><button type="button" class="sk-key on" ${sel('s:' + x, sk === 's:' + x)}><kbd>${key}</kbd>${skIco(x)}<b>${esc(skillName(x))}</b></button></li>`;
  // The next skill your line brings, ghosted where it will go.
  const ahead = skillOrder(p.id, p.mine).filter((y) => !p.known.includes(y) && !isRunSkill(y));
  const future = p.known.filter((y) => !isRunSkill(y)).length < p.slots ? ahead[i - p.equipped.length] : null;
  if (future) return `<li class="sk-key empty ghost" title="${esc(`${skillName(future)} at level ${unlockLevel(p.id, future, p.mine)}`)}"><kbd>${key}</kbd><b>${esc(skillName(future))}</b><small>Lv ${unlockLevel(p.id, future, p.mine)}</small></li>`;
  return `<li class="sk-key empty"><kbd>${key}</kbd><b>empty</b></li>`;
}
function cantripHtml(p, c, sk) {
  const at = unlockLevel(p.id, c.id);
  if (at > p.lvl) return `<li class="sk-key closed cantrip" title="${esc(`${c.name} at level ${at}`)}"><kbd>${c.key}</kbd><b>Lv ${at}</b></li>`;
  return `<li><button type="button" class="sk-key cantrip" ${sel('k:' + c.id, sk === 'k:' + c.id)}><kbd>${c.key}</kbd>${skIco(c.id)}<b>${esc(c.name)}</b></button></li>`;
}
// The presets over the bar (docs/kits.md 5.2): a chip for each, the one your bar follows lit, and + save bar.
function presetsHtml(p) {
  const { s, id } = p;
  if (id !== p.equippedArch || !p.kit || p.previewing) return '';
  const all = presetsOf(s, id), on = followOf(s, id);
  const chip = (n) => {
    const keys = presetKeys(s, id, n) || [];
    const title = `${keys.map((k, i) => `${LOADOUT.keys[i]} ${skillName(k)}`).join(' · ')}${all[n].shipped ? ' (shipped)' : ''}`;
    return `<button type="button" class="sk-preset${n === on ? ' on' : ''}" ${p.keysBusy || n === on ? 'disabled' : `data-command="loadout use ${esc(n)}"`} aria-pressed="${n === on}" title="${esc(title)}">${esc(n)}${all[n].shipped ? '' : ' <small>saved</small>'}</button>`;
  };
  return `<div class="sk-presets" aria-label="Presets">${Object.keys(all).map(chip).join('')}<button type="button" class="sk-preset save" data-prefill="loadout save " ${p.keysBusy ? 'disabled title="Presets change between fights"' : 'title="Keep this bar under a name: loadout save &lt;name&gt;"'}>+ save bar</button></div>`;
}
function chipHtml(p, x, sk) {
  const peek = p.previewing && !p.a.core.includes(x);
  const at = unlockLevel(p.id, x, p.shown), known = !peek && p.known.includes(x), k = !peek ? p.equipped.indexOf(x) : -1;
  const cls = peek ? 'preview' : k >= 0 ? 'eq' : known ? 'known' : 'locked';
  const tail = k >= 0 ? `<kbd>${LOADOUT.keys[k]}</kbd>` : known ? (isRunSkill(x) ? '<small>run</small>' : '') : `<small>Lv ${at}</small>`;
  return `<button type="button" class="sk-chip ${cls}" ${sel('s:' + x, sk === 's:' + x)}>${skIco(x)}<b>${esc(skillName(x))}</b>${tail}</button>`;
}
// A tree row's nodes: their state (picked, the other side, open to spend, locked) and pips.
function nodeState(p, n, row, i, j) {
  const { s, id } = p, ro = p.busy || p.previewing;
  if (row.kind === 'filler') {
    const r = (p.previewing ? s.loadout?.ranks?.[p.shown] || {} : ranksOf(s, id))[n.id] || 0;
    const rs = p.previewing ? 'blocked' : rowState(s, id, i);
    return { r, max: n.max, can: !ro && rs === 'open' && r < n.max, cls: r ? 'has' : !ro && rs === 'open' ? 'open' : rs === 'blocked' ? 'locked' : '', need: rs === 'blocked' && !p.previewing };
  }
  if (row.kind === 'choice') {
    const pk = (p.previewing ? s.loadout?.picks?.[p.shown] || [] : picksOf(s, id))[row.tier];
    const ts = picked(pk) ? 'picked' : p.previewing ? 'blocked' : tierState(s, id, row.tier);
    const on = pk === j, other = ts === 'picked' && !on;
    return { on, other, can: !ro && (ts === 'open' || other), cls: on ? 'pick' : other ? 'other' : ts === 'open' && !ro ? 'open' : 'locked', need: ts === 'blocked' && !p.previewing };
  }
  const pk = p.previewing ? s.loadout?.caps?.[p.shown] : capPickOf(s, id);
  const cs = picked(pk) ? 'picked' : p.previewing ? 'blocked' : capState(s, id);
  const on = pk === j, other = cs === 'picked' && !on, r = on ? Math.min(n.max, capstonePoints(s, id)) : 0;
  return { on, other, r, max: n.max, cs, can: !ro && (cs === 'open' || other), cls: on ? 'pick' : other ? 'other' : cs === 'open' && !ro ? 'open' : 'locked', need: cs === 'blocked' && !p.previewing };
}
// A ranks node's − and + on the row itself, beside its pips (the panel has them too). The same commands and the same
// reasons a step is off.
function rankStep(p, n, st) {
  const { s, id } = p, back = st.r > 0 && canTakeBack(s, id, n.id);
  const minus = `<button type="button" class="sk-sb" ${back ? `data-command="talent ${id} remove ${n.id}"` : 'disabled'} aria-label="Take a rank back from ${esc(n.name)}" title="${!st.r ? 'No ranks to take back' : back ? 'Take a rank back' : 'A deeper pick needs this point. Take that back first.'}">−</button>`;
  const plus = `<button type="button" class="sk-sb" ${st.can ? `data-command="talent ${id} add ${n.id}"` : 'disabled'} aria-label="Add a rank to ${esc(n.name)}" title="${st.can ? 'Add a rank' : st.r >= n.max ? 'Full' : st.need ? 'Needs points above it' : 'No free points'}">+</button>`;
  return `<span class="sk-step">${minus}${plus}</span>`;
}
function treeHtml(p, sk) {
  const { s, id, kit } = p;
  const rows = TREE.map((row, i) => {
    const above = p.previewing ? 0 : spentAbove(s, id, i), open = !p.previewing && above >= row.need && (row.kind !== 'capstone' || capstonePoints(s, id) > 0);
    const label = row.kind === 'filler' ? 'Ranks' : row.kind === 'choice' ? `Tier ${row.tier + 1}` : `Lv ${LOADOUT.capstoneAt[0]}`;
    const nodes = row.kind === 'filler' ? kit.fillers[row.row] : row.kind === 'choice' ? kit.talents[row.tier] : kit.capstones;
    const node = (n, j) => {
      const st = nodeState(p, n, row, i, j);
      const tail = row.kind === 'filler' ? pips(st.r, st.max) : row.kind === 'capstone' ? pips(st.r, st.max) : '';
      const need = st.need ? `<small>${above}/${row.need}</small>` : '';
      const btn = `<button type="button" class="sk-tn ${st.cls}${row.kind === 'capstone' ? ' cap' : ''}" ${sel('t:' + n.id, sk === 't:' + n.id)}>${st.on ? '<i class="sk-check" aria-hidden="true">✓</i>' : ''}<b>${esc(n.name)}</b>${need || tail}</button>`;
      return row.kind === 'filler' && !p.busy && !p.previewing ? `<span class="sk-tnw">${btn}${rankStep(p, n, st)}</span>` : btn;
    };
    return `<span class="sk-tl${open ? ' lit' : ''}"><i></i>${label}</span>${node(nodes[0], 0)}<span class="sk-or">${row.kind === 'filler' ? '' : 'or'}</span>${node(nodes[1], 1)}`;
  }).join('');
  return `<div class="sk-tree">${rows}</div>`;
}
function rootsHtml(p, sk) {
  const items = itemsOf(p);
  return `<div class="sk-roots">${['passive', 'sync', 'kit', 'edge'].filter((r) => items.has('r:' + r)).map((r) => {
    const it = items.get('r:' + r), locked = it.level && p.lvl < it.level;
    return `<button type="button" class="sk-root${locked ? ' locked' : ''}${r === 'sync' ? ' sync' : ''}" ${sel('r:' + r, sk === 'r:' + r)}>${glyph(ROOT[r][1])}<small>${ROOT[r][0]}${locked ? ` · Lv ${it.level}` : ''}</small><b>${esc(it.name)}</b></button>`;
  }).join('')}</div>`;
}

// The first thing the panel explains when nothing is picked: your first key, else your first skill.
const firstKey = (p) => (p.equipped[0] ? 's:' + p.equipped[0] : 's:' + p.a.core[0]);

export function skillsTabMarkup(s, view, ui = {}) {
  const p = pageOf(s, view), { id, a, kit, lvl, hk } = p;
  const items = itemsOf(p), sk = items.has(ui.sel) ? ui.sel : firstKey(p);
  const st = STATUSES[a.status];
  const next = xpToNext(lvl), pct = lvl < LOADOUT.maxLevel ? Math.max(0, Math.min(100, (hk.xp / next) * 100)) : 100;
  // The head's right side: the subclass you picked, its other, and the class alone to look at; or the way to choose.
  let side = '';
  if (p.mine) {
    const nav = [['core', `${a.name} core`], ...Object.values(a.subs).map((x) => [x.id, x.name])].map(([k, name]) => {
      const on = (k === 'core' && !kit) || k === p.shown;
      return `<button type="button" data-arch="${id}/${k}" aria-pressed="${on}">${esc(name)}${k === p.mine ? '<i class="sk-yours" title="Yours"></i>' : ''}</button>`;
    }).join('');
    const why = p.keysBusy ? 'Between fights' : p.busy ? 'At home' : `Switch to ${kit?.name}`;
    const sw = p.previewing ? `<button type="button" class="btn small" ${p.busy ? 'disabled' : `data-command="subclass ${id} ${kit.id}"`} title="${esc(why)}">Switch</button>` : '';
    side = `<nav class="sk-subnav" aria-label="Subclass">${nav}</nav>${sw}`;
  } else if (p.waiting) side = `<button type="button" class="btn primary sk-choose" data-bo-open="${id}">Choose your subclass</button>`;
  const head = `<header class="sk-head"><pre class="sk-emblem" aria-hidden="true">${esc(EMBLEMS[id].join('\n'))}</pre>
    <div class="sk-id"><h2>${kit ? esc(a.name) : a.role.map(esc).join(' · ')}</h2><h1>${esc(kit ? kit.name : a.name)}${p.previewing ? ' <span class="tag preview">Preview</span>' : ''}</h1>
      <div class="sk-lv"><b>Lv ${lvl}</b>${lvl < LOADOUT.maxLevel ? `<span class="lvl-bar" title="${fmt(hk.xp)} / ${fmt(next)} XP"><span style="width:${pct.toFixed(1)}%"></span></span><small>${Math.floor(pct)}%</small>` : '<small>max level</small>'}<span class="tag stag status sk-status" title="${esc(`${st.name}: ${st.rule}`)}">${esc(st.name)}</span></div></div>
    <div class="sk-side">${side}</div></header>`;

  const bar = `<section class="sk-sec sk-barsec"><h3>Bar</h3><div><ol class="sk-bar" aria-label="Your bar">${[cantripHtml(p, cantripsOf(id)[0], sk), ...Array.from({ length: LOADOUT.equipSlots }, (_, i) => keyHtml(p, i, sk)), ...cantripsOf(id).slice(1).map((c) => cantripHtml(p, c, sk))].join('')}</ol>${presetsHtml(p)}</div></section>`;

  const line = kit ? lineOf(kit).map((x) => x.id) : [];
  const all = [...a.core, ...line], have = all.filter((x) => p.known.includes(x) && !(p.previewing && !a.core.includes(x))).length;
  const range = (ids, sub) => { const ls = ids.map((x) => unlockLevel(id, x, sub)).filter(Number.isFinite); return `Lv ${Math.min(...ls)}–${Math.max(...ls)}`; };
  const skills = `<section class="sk-sec"><h3>Skills<small>${have}/${all.length}</small></h3><div class="sk-chips">
      <span class="sk-chips-h">${esc(a.name)} · ${range(a.core, null)}</span>${a.core.map((x) => chipHtml(p, x, sk)).join('')}
      ${kit ? `<span class="sk-chips-h">${esc(kit.name)} · ${range(line, kit.id)}${p.previewing ? ' · preview' : ''}</span>${line.map((x) => chipHtml(p, x, sk)).join('')}` : ''}</div></section>`;

  const points = talentPoints(s, id), spent = kit && !p.previewing ? pointsSpent(s, id) : 0, free = Math.max(0, points - spent);
  const reset = spent && kit && !p.previewing && !p.busy ? `<button type="button" class="btn small sk-reset" data-command="talent reset ${id}" title="Take back every point and pick (free at home)">Reset</button>` : '';
  const pts = kit
    ? `<div class="sk-pts" title="${esc(`A talent point every ${LOADOUT.talentEvery} levels from level ${LOADOUT.talentFrom}`)}"><b>${p.previewing ? '' : `${free} free`}</b><span class="sk-ptbar"><i style="width:${Math.min(100, (spent / TREE_MAX) * 100).toFixed(1)}%"></i></span><span>${spent} of ${TREE_MAX} · ${points} earned</span>${reset}</div>${treeHtml(p, sk)}`
    : p.waiting ? `<div class="sk-pts" title="Talent points go into your subclass's tree"><b>${points} free</b><span>${points} earned</span></div>` : '';
  const talents = `<section class="sk-sec sk-talents"><h3>Talents${kit ? `<small>${spent}/${TREE_MAX}</small>` : ''}</h3><div>${rootsHtml(p, sk)}${pts}</div></section>`;

  return `<div class="sk-page">
    <section class="card sk-card${p.previewing ? ' preview' : ''}">${head}${bar}${skills}${talents}</section>
    <aside class="sk-panel${ui.sheet ? ' open' : ''}" aria-label="Details" aria-live="polite" data-showing="${esc(sk)}">${detailHtml(p, items, sk)}</aside>${ui.sheet ? '<div class="sk-scrim" data-sk-close></div>' : ''}
  </div>`;
}

// The panel for an item on the page (app.js shows the hovered or focused one with it, without a redraw).
export function skillDetailMarkup(s, view, key) {
  const p = pageOf(s, view), items = itemsOf(p);
  return detailHtml(p, items, items.has(key) ? key : firstKey(p));
}

// ---------- the detail panel: where the rules live ----------
const close = '<button type="button" class="sk-x" data-sk-close aria-label="Close">×</button>';
function cooldownTag(p, x) {
  const ab = ABILITIES[x];
  if (!ab) return '';
  if (ab.once) return '<span class="tag" title="Once per fight">1/fight</span>';
  if (LIT.has(x)) return '<span class="tag" title="Usable just after its moment">lit</span>';
  const n = p.id === classOf(p.s) ? cooldownOf(p.s, x) : ab.cooldown || 0;
  return `<span class="tag" title="${n ? `Cooldown: ${n} ${n === 1 ? 'cycle' : 'cycles'}` : 'No cooldown'}">⟳ ${n || '—'}</span>`;
}
function withHtml(p, items, key) {
  const ks = withOf(items, key);
  if (!ks.length) return '';
  return `<div class="sk-with"><h3>Works with</h3><ul>${ks.map((k) => {
    const o = items.get(k);
    let side;
    if (o.kind === 'skill') { const at = p.equipped.indexOf(o.id); side = at >= 0 ? `<small class="you">key ${LOADOUT.keys[at]}</small>` : p.known.includes(o.id) ? '<small>skill</small>' : `<small>Lv ${unlockLevel(p.id, o.id, o.sub || p.shown)}</small>`; }
    else side = `<small>${o.kind === 'root' ? ROOT[o.root][0] : 'talent'}</small>`;
    return `<li><button type="button" data-sk="${esc(k)}">${o.kind === 'skill' ? skIco(o.id) : glyph(o.kind === 'root' ? ROOT[o.root][1] : 'xp')}<b>${esc(o.name)}</b>${side}</button></li>`;
  }).join('')}</ul></div>`;
}
function detailHtml(p, items, key) {
  const it = items.get(key);
  if (!it) return close;
  const { s, id } = p;
  const head = (frame, kick, name) => `${close}<div class="sk-ph"><span class="sk-frame">${frame}</span><div><small>${kick}</small><h2>${esc(name)}</h2></div></div>`;
  if (it.kind === 'skill' || it.kind === 'cantrip') {
    const x = it.id, sub = it.sub || null;
    const peek = it.preview || (p.previewing && !!sub && sub === p.shown);
    const at = it.kind === 'cantrip' ? unlockLevel(id, x) : unlockLevel(id, x, sub), known = it.kind === 'cantrip' ? at <= p.lvl : !peek && p.known.includes(x);
    const k = it.kind === 'cantrip' ? cantripsOf(id).find((c) => c.id === x)?.key : !peek ? LOADOUT.keys[p.equipped.indexOf(x)] : null;
    const spec = SUBS[sub]?.tags?.[x];
    const facts = [k && known ? `<span class="tag you">key ${k}</span>` : '', it.kind === 'skill' ? cooldownTag(p, x) : '', `<span class="tag">${VERB[ABILITIES[x]?.verb] || (it.kind === 'cantrip' ? 'everyone' : 'utility')}</span>`, `<span class="tag">${known ? `Lv ${at}` : `opens Lv ${at}`}</span>`, spec ? `<span class="tag" title="Best on this board, on top of its general use">${esc(spec)}</span>` : '', isRunSkill(x) ? '<span class="tag" title="Takes no slot: type it on a run">run</span>' : ''].join('');
    const kick = it.kind === 'cantrip' ? 'Everyone' : `${esc(sub ? SUBS[sub].name : ARCHETYPES[id].name)} skill`;
    const lore = SKILL_TEXT[x]?.lore;
    return `${head(skIco(x), kick, it.name)}<div class="sk-facts">${facts}</div><p class="sk-rule">${ruleHtml(it.text)}</p>${lore ? `<p class="sk-lore">${esc(lore)}</p>` : ''}${it.kind === 'skill' && !it.preview ? skillActs(p, x, known, peek) : ''}${withHtml(p, items, key)}`;
  }
  if (it.kind === 'root') {
    const locked = it.level && p.lvl < it.level;
    const kick = `${ROOT[it.root][0]}${it.level ? ` · Lv ${it.level}` : ''}`;
    return `${head(glyph(ROOT[it.root][1]), kick, it.name)}${locked ? `<div class="sk-facts"><span class="tag">opens Lv ${it.level}</span></div>` : ''}<p class="sk-rule">${ruleHtml(it.text)}</p>${withHtml(p, items, key)}`;
  }
  // A talent node: ranks, a tier's side, or a capstone.
  const { node: n, row, i, j, alt } = it;
  const st = it.preview ? { r: 0, max: n.max, on: false } : nodeState(p, n, row, i, j);
  const kick = row.kind === 'filler' ? `Ranks · ${st.r}/${n.max}` : row.kind === 'choice' ? `Tier ${row.tier + 1}` : `Capstone · Lv ${LOADOUT.capstoneAt[0]}`;
  const facts = it.preview ? '' : row.kind === 'filler' ? (st.r ? `<span class="tag you">${st.r} of ${n.max}</span>` : '') : st.on ? `<span class="tag you">picked${row.kind === 'capstone' ? ` · rank ${st.r}/${n.max}` : ''}</span>` : '';
  const need = st.need ? `<span class="tag">${spentAbove(s, id, i)}/${row.need} points above</span>` : '';
  const body = row.kind === 'capstone' ? `<p class="sk-rule">${ruleHtml(n.rules[0])}</p><p class="sk-rule">Rank ${n.max} at level ${LOADOUT.capstoneAt[n.max - 1]}: ${ruleHtml(n.rules[n.max - 1])}</p>` : `<p class="sk-rule">${ruleHtml(n.rule)}</p>`;
  const other = row.kind !== 'filler' && alt ? `<div class="sk-alt"><small>${st.on ? 'Instead of' : 'Or'}</small><b>${esc(alt.name)}</b><p>${esc(alt.rules?.[0] || alt.rule)}</p></div>` : '';
  return `${head(glyph(row.kind === 'filler' ? 'xp' : row.kind === 'choice' ? 'critDamage' : 'mastered'), kick, n.name)}${facts || need ? `<div class="sk-facts">${facts}${need}</div>` : ''}${body}${other}${it.preview ? '' : nodeActs(p, n, row, j, st)}${withHtml(p, items, key)}`;
}
// A skill's buttons: equip or unequip, and a key to put it on (a skill already on the bar swaps places with what's there).
function skillActs(p, x, known, peek) {
  const { id } = p;
  if (peek || !known) return '';
  if (p.keysBusy) return '<div class="sk-acts"><span class="tag dim">Between fights</span></div>';
  if (p.busy && id !== p.equippedArch) return '<div class="sk-acts"><span class="tag dim">At home</span></div>';
  if (isRunSkill(x)) return '';
  const at = p.equipped.indexOf(x), full = p.equipped.length >= p.slots;
  const main = at >= 0 ? `<button type="button" class="btn" data-command="unequip ${id} ${x}">Unequip</button>`
    : `<button type="button" class="btn primary" ${full ? `disabled title="All ${p.slots} keys are full: put it on a key below, or unequip one"` : `data-command="equip ${id} ${x}"`}>Equip</button>`;
  const keys = Array.from({ length: Math.min(p.slots, p.equipped.length + (at >= 0 ? 0 : 1)) }, (_, i) => {
    const k = LOADOUT.keys[i], on = p.equipped[i];
    const title = on === x ? `On key ${k}` : on ? `Key ${k}: in place of ${skillName(on)}` : `Key ${k}`;
    return `<button type="button" class="sk-kpick${on === x ? ' on' : on ? '' : ' free'}" ${on === x ? 'disabled' : `data-command="equip ${id} ${x} ${k}"`} aria-pressed="${on === x}" title="${esc(title)}">${k}</button>`;
  }).join('');
  return `<div class="sk-acts">${main}<div class="sk-keys" role="group" aria-label="Put on key"><small>Key</small>${keys}</div></div>`;
}
function nodeActs(p, n, row, j, st) {
  const { id } = p;
  if (p.previewing) return '';
  if (p.busy) return `<div class="sk-acts"><span class="tag dim">${p.keysBusy ? 'Between fights' : 'At home'}</span></div>`;
  if (row.kind === 'filler') {
    const add = `<button type="button" class="btn primary" ${st.can ? `data-command="talent ${id} add ${n.id}"` : 'disabled'} title="${st.can ? 'Add a rank' : st.r >= n.max ? 'Full' : st.need ? 'Needs points above it' : 'No free points'}">+ Rank</button>`;
    const minus = st.r ? `<button type="button" class="btn" ${canTakeBack(p.s, id, n.id) ? `data-command="talent ${id} remove ${n.id}" title="Take a rank back"` : 'disabled title="A deeper pick needs this point: take that back first"'}>− Rank</button>` : '';
    return `<div class="sk-acts">${add}${minus}</div>`;
  }
  if (st.on) return '';
  const cmd = row.kind === 'choice' ? `talent ${id} ${row.tier + 1} ${j ? 'b' : 'a'}` : `talent ${id} capstone ${j ? 'b' : 'a'}`;
  const why = st.need ? 'Needs points above it' : row.kind === 'capstone' && st.cs === 'locked' ? `At level ${LOADOUT.capstoneAt[0]}` : 'No free points';
  return `<div class="sk-acts"><button type="button" class="btn primary" ${st.can ? `data-command="${cmd}"` : `disabled title="${esc(why)}"`}>${st.other ? 'Swap to this' : 'Pick'}</button></div>`;
}

// ---------- the subclass breakout ----------
// Open by itself when the class in use is past SUBCLASS.from with no pick, you're home and out of a fight, and you
// haven't put it off (Later). app.js also waits for the screen to be free (no fight result or class picker up).
export const breakoutDue = (s) => subWaiting(s) && !s.loadout?.subLater?.[classOf(s)] && !active(s) && !s.run;
export const BREAKOUT_STEPS = ['Idea', 'Skills', 'Talents', 'Choose'];
// Your bar as that subclass at a level: the pick's (its rotation preset at your level), filled as its rotation fills.
function barAt(s, arch, sub, level) {
  const rot = shippedPresets(sub).rotation || [], from = Math.min(level, Math.max(SUBCLASS.from, hackerLevel(s, arch)));
  let bar = presetBar(arch, sub, from, rot);
  for (let l = from + 1; l <= level; l++) {
    const want = presetBar(arch, sub, l, rot), out = bar.map((x) => (want.includes(x) ? x : null));
    for (const x of want) if (!out.includes(x)) { const i = out.indexOf(null); if (i >= 0) out[i] = x; else out.push(x); }
    bar = out.filter(Boolean);
  }
  return bar;
}
export const breakoutLevels = (s, arch) => { const L = hackerLevel(s, arch); return [...new Set([L, 22, 30, 38].filter((l) => l >= L))].sort((a, b) => a - b); };

function breakoutItems(p, subs) {
  const items = itemsOf(p); // the class's own: its core, cantrips and roots
  for (const k of subs) {
    for (const { id: x } of lineOf(k)) items.set(`b:${k.id}:${x}`, { kind: 'skill', id: x, name: skillName(x), text: skillText(p.s, x, p.id), sub: k.id, preview: true });
    items.set('be:' + k.id, { kind: 'root', root: 'edge', name: k.edge.name, text: k.edge.rule, level: SUBCLASS.from });
    treeNodes(k, (n, row, i, j, alt) => items.set(`bt:${k.id}:${n.id}`, { kind: row.kind, node: n, row, i, j, alt, name: n.name, text: n.rules?.[0] || n.rule, preview: true }));
  }
  return items;
}
// "Works with" in the breakout: within one subclass (and the class's core), never across the two.
function scoped(items, key) {
  const sub = key.split(':')[1], out = new Map();
  for (const [k, o] of items) if (!/^(b|bt|be):/.test(k) || k.split(':')[1] === sub || (k.startsWith('be:') && k === 'be:' + sub)) out.set(k, o);
  return out;
}

export function breakoutMarkup(s, ui = {}) {
  const arch = ARCHETYPES[ui.arch] ? ui.arch : classOf(s), a = ARCHETYPES[arch];
  const p = pageOf(s, arch), subs = Object.values(a.subs), [A, B] = subs;
  const step = Math.max(1, Math.min(4, Number(ui.step) || 1));
  const items = breakoutItems(p, subs);
  const lvls = breakoutLevels(s, arch), atLvl = lvls.includes(Number(ui.lvl)) ? Number(ui.lvl) : lvls[0];
  const steps = BREAKOUT_STEPS.map((x, i) => `<button type="button" role="tab" data-bo-step="${i + 1}" aria-selected="${step === i + 1}" class="${i + 1 < step ? 'done' : ''}"><span>${i + 1 < step ? '✓' : i + 1}</span>${x}</button>`).join('');
  const top = `<div class="bo-top"><div><p class="bo-kick">Level ${p.lvl} · ${esc(a.name)}</p><h1>Choose a subclass</h1></div>
    <nav class="bo-steps" role="tablist" aria-label="Steps">${steps}</nav>
    <button type="button" class="btn small bo-later" data-bo-later title="${esc(`Until you choose, you play the ${a.name} core. The choice waits on Loadout → Skills and talents.`)}">Later</button></div>`;
  const mark = (k) => `<span class="bo-mark">${ico(SUB_ICON[k.id] || 'command')}</span>`;
  const head = (k) => `<div class="bo-name">${mark(k)}<div><h2>${esc(k.name)}</h2><p>${k.role.map(esc).join(' · ')}</p></div></div>`;
  const pts = TREE_MAX;
  let body = '', sk = null, panel = '';
  if (step === 1) {
    const side = (k) => `<article class="bo-side">${head(k)}<p class="bo-idea">${esc(k.idea)}</p>
      <dl class="bo-rows"><dt>Solo</dt><dd>${esc(k.solo)}</dd><dt>Crew</dt><dd>${esc(k.crew)}</dd></dl>
      <div class="bo-edge"><small>Edge · from level ${SUBCLASS.from}</small><b>${esc(k.edge.name)}</b><p>${esc(k.edge.rule)}</p></div>
      <div class="bo-strip">${lineOf(k).filter((x) => !isRunSkill(x.id)).map((x) => `<span title="${esc(`${skillName(x.id)} · level ${x.level}`)}"><span class="bo-frame">${skIco(x.id)}</span><small>${x.level}</small></span>`).join('')}</div>
      <div class="bo-gets"><div><small>Skills</small><b>${lineOf(k).filter((x) => !isRunSkill(x.id)).length}</b> <span>Lv ${SUBCLASS.unlocks[0]}–${SUBCLASS.unlocks.at(-1)}</span></div><div><small>Talents</small><b>${pts}</b> <span>points</span></div><div><small>Presets</small><b>${Object.keys(k.presets).length}</b> <span>${Object.keys(k.presets).map(esc).join(', ')}</span></div></div></article>`;
    body = `<div class="bo-vs">${side(A)}<div class="bo-mid"><pre class="sk-emblem" aria-hidden="true">${esc(EMBLEMS[arch].join('\n'))}</pre><span class="bo-fork"></span></div>${side(B)}</div>`;
  } else if (step === 2 || step === 3) {
    let rows = `<span class="bo-lhead">${esc(A.name)}</span><span></span><span class="bo-lhead r">${esc(B.name)}</span>`;
    if (step === 2) {
      sk = items.has(ui.sel) ? ui.sel : `b:${A.id}:${lineOf(A)[0].id}`;
      const shared = (k, x) => subs.some((o) => o !== k && o.skills.includes(x));
      const chip = (k, x, r) => `<button type="button" class="sk-chip bo-chip${r ? ' r' : ''}" ${sel(`b:${k.id}:${x}`, sk === `b:${k.id}:${x}`)}>${skIco(x)}<b>${esc(skillName(x))}</b>${shared(k, x) ? '<small title="Both subclasses get it">both</small>' : isRunSkill(x) ? '<small>run</small>' : ''}</button>`;
      const levels = [...new Set([...lineOf(A), ...lineOf(B)].map((x) => x.level))].sort((x, y) => x - y);
      for (const l of levels) {
        const xa = lineOf(A).filter((x) => x.level === l), xb = lineOf(B).filter((x) => x.level === l);
        for (let n = 0; n < Math.max(xa.length, xb.length); n++) rows += `${xa[n] ? chip(A, xa[n].id, false) : '<span></span>'}<span class="bo-lv"><span>${n ? '' : l}</span></span>${xb[n] ? chip(B, xb[n].id, true) : '<span></span>'}`;
      }
      // Your bar as each, at a level: your core keys and the subclass's (marked +) as its rotation fills.
      const bars = subs.map((k) => {
        const bar = barAt(s, arch, k.id, atLvl), slots = barSlots(atLvl), cs = cantripsOf(arch);
        const keys = Array.from({ length: LOADOUT.equipSlots }, (_, i) => {
          const x = bar[i], kk = LOADOUT.keys[i];
          if (i >= slots) return `<li class="sk-key closed"><kbd>${kk}</kbd><b>Lv ${LOADOUT.bar.find(([, n]) => n > i)?.[0]}</b></li>`;
          if (!x) return `<li class="sk-key empty"><kbd>${kk}</kbd><b>empty</b></li>`;
          const mine = a.core.includes(x), key = mine ? 's:' + x : `b:${k.id}:${x}`;
          return `<li><button type="button" class="sk-key on${mine ? '' : ' new'}" ${sel(key, sk === key)} title="${esc(mine ? `${skillName(x)}: yours` : `${skillName(x)}: new with ${k.name}, level ${unlockLevel(arch, x, k.id)}`)}"><kbd>${kk}</kbd>${skIco(x)}<b>${esc(skillName(x))}</b></button></li>`;
        }).join('');
        const cant = (c) => `<li class="sk-key cantrip${unlockLevel(arch, c.id) > atLvl ? ' closed' : ''}"><kbd>${c.key}</kbd>${skIco(c.id)}<b>${esc(c.name)}</b></li>`;
        return `<div class="bo-bar"><b>${esc(k.name)}</b><ol class="sk-bar" aria-label="${esc(`Your bar as ${k.name} at level ${atLvl}`)}">${cant(cs[0])}${keys}${cs.slice(1).map(cant).join('')}</ol></div>`;
      }).join('');
      body = `<section class="bo-bars"><div class="bo-bars-h"><h3>Your bar</h3><nav class="bo-lvls" aria-label="At level">${lvls.map((l) => `<button type="button" data-bo-lvl="${l}" aria-pressed="${l === atLvl}">Lv ${l}</button>`).join('')}</nav></div>${bars}</section>`;
    } else {
      sk = items.has(ui.sel) ? ui.sel : `bt:${A.id}:${A.talents[0][0].id}`;
      TREE.forEach((row, i) => {
        const label = row.kind === 'filler' ? 'ranks' : row.kind === 'choice' ? `tier ${row.tier + 1}` : `Lv ${LOADOUT.capstoneAt[0]}`;
        const pair = (k) => `<div class="bo-pair">${(row.kind === 'filler' ? k.fillers[row.row] : row.kind === 'choice' ? k.talents[row.tier] : k.capstones).map((n) => `<button type="button" class="sk-tn" ${sel(`bt:${k.id}:${n.id}`, sk === `bt:${k.id}:${n.id}`)}><b>${esc(n.name)}</b>${row.kind === 'choice' ? '' : pips(0, n.max)}</button>`).join(`<span class="sk-or">${row.kind === 'filler' ? '' : 'or'}</span>`)}</div>`;
        rows += `${pair(A)}<span class="bo-lv"><span>${label}</span></span>${pair(B)}`;
      });
    }
    panel = `<aside class="sk-panel bo-panel${ui.sheet ? ' open' : ''}" aria-label="Details" aria-live="polite" data-showing="${esc(sk)}">${detailHtml(p, scoped(items, sk), sk)}</aside>${ui.sheet ? '<div class="sk-scrim" data-sk-close></div>' : ''}`;
    body += `<div class="bo-layout"><div class="bo-ladder">${rows}</div>${panel}</div>`;
  } else {
    const busy = active(s);
    body = `<div class="bo-choose">${subs.map((k) => `<article class="bo-side">${head(k)}<p class="bo-idea">${esc(k.idea)}</p><div class="bo-edge"><small>Edge</small><b>${esc(k.edge.name)}</b></div><button type="button" class="btn primary" ${busy ? 'disabled title="Between fights"' : `data-command="subclass ${arch} ${k.id}" title="Switching later is free at home"`}>Choose ${esc(k.name)}</button></article>`).join('')}</div>`;
  }
  const nav = step < 4 ? `<div class="bo-next">${step > 1 ? `<button type="button" class="btn" data-bo-step="${step - 1}">Back</button>` : ''}<button type="button" class="btn primary" data-bo-step="${step + 1}">${BREAKOUT_STEPS[step]} ›</button></div>` : `<div class="bo-next"><button type="button" class="btn" data-bo-step="3">Back</button></div>`;
  return `<div class="bo-scene" role="dialog" aria-modal="true" aria-label="Choose a subclass"><div class="bo-walk">${top}${body}${nav}</div></div>`;
}

// The panel for an item in the breakout (app.js: hover and focus, as on the page).
export function breakoutDetailMarkup(s, ui = {}, key) {
  const arch = ARCHETYPES[ui.arch] ? ui.arch : classOf(s), p = pageOf(s, arch);
  const items = breakoutItems(p, Object.values(ARCHETYPES[arch].subs));
  return items.has(key) ? detailHtml(p, scoped(items, key), key) : '';
}

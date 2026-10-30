// The Codex's Collection tab, the Ledger (collection.mjs is the model): the index on the left, each entry with its n of
// N and a thin bar; the entry on the right, one line a slot under its section (Uniques, each set, Mastered, Beaten,
// Feats): its icon, its name or ???, a muted hint, and the date it first came. The rule behind a line is its tooltip.
// Amber is what you've collected, a set piece in the set's green; ??? is gray. On a phone the index folds as the Codex's.
import { esc } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { UNIQUES } from './combat.mjs';
import { RESEARCH } from './research.mjs';
import { achById } from './achievements.mjs';
import { logOf, logTotals } from './collection-log.mjs';

const UNKNOWN = '???';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (t) => (t > 1 ? `${MON[new Date(t).getMonth()]} ${new Date(t).getDate()}` : '');
const SLOT_ICON = { Exploit: 'exploit', Proxy: 'relay', Shell: 'module', Script: 'cipher', Implant: 'injector' };
const ICON = { family: 'worm', strain: 'cipher', guard: 'watchman', boss: 'bounty', floor: 'node', other: 'crate' };
const KIND = { family: 'Family', strain: 'Strain', guard: 'Guard', boss: 'Boss', floor: 'Floor', other: 'Source' };
const LABEL = { unique: 'Uniques', mastered: 'Mastered', beaten: 'Beaten', feat: 'Feats' };
const bar = (n, N, cls = '') => `<i class="lg-bar${cls ? ' ' + cls : ''}" aria-hidden="true"><b style="width:${Math.round((n / Math.max(1, N)) * 100)}%"></b></i>`;
const count = (n, N, tip) => `<small class="lg-n${N && n >= N ? ' full' : ''}"${tip ? ` title="${esc(tip)}"` : ''}>${n}/${N}</small>`;
const cap = (t) => t.replace(/[a-z]/, (c) => c.toUpperCase());
const since = (t) => (t > 1 ? ` First on ${day(t)}.` : t === 1 ? ' From before the log.' : '');

// One line: { icon, name (null: ???), hint, tip, cls }.
function line(e, x) {
  const where = (e.group === 'floor' ? `${e.name}'s ${x.where?.toLowerCase()}` : e.name) || 'its source';
  let icon = 'item', name = null, hint = '', tip = '', cls = '';
  if (x.kind === 'unique' || x.kind === 'set') {
    const u = UNIQUES[x.key], kind = x.kind === 'set' ? `${x.slot} from the ${x.setName} set` : `unique ${x.slot}`;
    icon = SLOT_ICON[x.slot] || 'item'; cls = x.got ? (x.kind === 'set' ? 'iname r-set' : 'iname r-zeroday') : '';
    name = x.got ? x.name : null;
    hint = x.got ? x.slot : [`Lv ${x.level}`, e.group === 'floor' ? x.where : ''].filter(Boolean).join(' · ');
    tip = x.got ? `${x.name}: ${cap(kind)}, level ${x.level}.${since(x.when)}${u?.flavour ? `\n▸ ${u.flavour}` : ''}` : `${UNKNOWN}: A ${kind}, level ${x.level}.\n▸ Drops from ${where}.`;
  } else if (x.kind === 'mastered') {
    icon = 'mastered'; name = x.name;
    tip = x.name ? `${x.name}: ${x.got ? `Mastered.${since(x.when)}` : `Research ${Math.min(x.n, RESEARCH.max)} of ${RESEARCH.max}.\n▸ Break it, cut its move and answer its tells.`}` : `${UNKNOWN}: A part met from level ${x.level}.`;
  } else if (x.kind === 'beaten') {
    icon = 'kill'; name = x.name; hint = x.got ? '' : x.rule.replace(/\.$/, '');
    tip = `${x.name}: ${x.got ? `Done.${since(x.when)}` : x.rule}`;
  } else {
    const a = achById(x.ach), hidden = a?.hidden && !x.got;
    icon = 'medal'; name = a ? (hidden ? null : a.name) : x.ach; hint = x.got ? '' : hidden ? a.hint.replace(/\.$/, '') : a?.rule.replace(/\.$/, '') || '';
    tip = `${hidden ? UNKNOWN : a?.name || x.ach}: Achievement. ${hidden ? a.hint : a?.rule || ''}${since(x.when)}`;
  }
  const research = x.kind === 'mastered' && !x.got ? `<span class="lg-rs">${bar(Math.min(x.n, RESEARCH.max), RESEARCH.max)}<small>${Math.min(x.n, RESEARCH.max)}/${RESEARCH.max}</small></span>` : `<small class="lg-hint">${esc(hint)}</small>`;
  return `<li class="lg-line${x.got ? ' got' : ''}${x.kind === 'set' ? ' set' : ''}" title="${esc(tip)}"><span class="lg-ico" aria-hidden="true">${glyph(icon)}</span><b class="${name ? cls : 'unk'}">${esc(name || UNKNOWN)}</b>${research}<time>${esc(day(x.when))}</time></li>`;
}
function entryMarkup(e) {
  const head = `<header class="lg-head"><div class="cx-title"><h2>${KIND[e.group]}${(e.group === 'floor' || e.group === 'boss') && e.lv ? ` <span class="tag dim">Lv ${e.lv}+</span>` : ''}</h2><h1${e.name ? '' : ' class="unknown"'}>${esc(e.name || UNKNOWN)}</h1></div><div class="lg-total"><b>${e.have}<small>/${e.total}</small></b>${bar(e.have, e.total)}</div></header>`;
  const secs = e.sections.map((sec) => {
    const lines = sec.slots.map((x) => line(e, sec.kind === 'set' ? { ...x, setName: sec.name } : x)).join('');
    const kick = sec.kind === 'set'
      ? `<span class="lg-setname">${esc(sec.name)}</span>${count(sec.have, sec.of, `${sec.name}: Set. ${sec.have} of ${sec.of} pieces found, here and elsewhere.`)}`
      : `${LABEL[sec.kind]}${count(sec.slots.filter((x) => x.got).length, sec.slots.length)}`;
    return `<section class="cx-sec"><h3 class="cx-kick">${kick}</h3><ul class="lg-lines">${lines}</ul></section>`;
  }).join('');
  return head + secs;
}
// The tabs over the Codex's index: the Codex, and the Collection with its count.
export const codexTabs = (on, have, total) => `<div class="lg-tabs" role="tablist"><button type="button" role="tab" data-codex-tab="codex" aria-selected="${on === 'codex'}"${on === 'codex' ? ' class="on"' : ''}>Codex</button><button type="button" role="tab" data-codex-tab="log" aria-selected="${on === 'log'}"${on === 'log' ? ' class="on"' : ''}>Collection${total ? ` <small>${have}/${total}</small>` : ''}</button></div>`;
// The tab. sel: the entry picked (app.js logSel), idx: the phone's index open.
export function collectionPageMarkup(s, sel = null, idx = false) {
  const log = logOf(s), all = log.flatMap((g) => g.rows), T = logTotals(log);
  const e = all.find((x) => x.key === sel) || all.find((x) => x.known) || all[0];
  const rows = log.map((g) => `<section class="cx-grp" aria-label="${esc(g.name)}"><h3><span>${esc(g.name)}</span><small>${g.have}/${g.total}</small></h3><ul>${g.rows.map((r) => `<li><button type="button" class="cx-row lg-row${r.known ? '' : ' unknown'}${r === e ? ' on' : ''}" data-log="${esc(r.key)}" aria-current="${r === e}"><span class="cx-ico" aria-hidden="true">${r.known ? glyph(ICON[r.group]) : '<i class="cx-none"></i>'}</span><span class="cx-name">${esc(r.name || UNKNOWN)}</span>${count(r.have, r.total)}${bar(r.have, r.total, 'thin')}</button></li>`).join('')}</ul></section>`).join('');
  return `<div class="cx-page${idx ? ' idx-open' : ''}">
    <nav class="cx-index card" aria-label="Collection index">${codexTabs('log', T.have, T.total)}<button type="button" class="cx-fold" data-codex-fold aria-expanded="${idx}"><span class="cx-label">Index</span><b>${esc(e?.name || UNKNOWN)}</b><span class="cx-caret" aria-hidden="true">${idx ? '▴' : '▾'}</span></button><div class="cx-groups">${rows}</div></nav>
    <article class="cx-entry card lg-entry" aria-label="Collection entry" data-log-entry="${esc(e?.key || '')}">${e ? entryMarkup(e) : ''}</article></div>`;
}

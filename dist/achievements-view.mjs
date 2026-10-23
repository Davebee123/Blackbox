// The Achievements page (System → Achievements): the categories on the left with their totals, the chosen
// category's achievements beside them. Pure functions of state. Each row shows; its rule is its tooltip.
//   ui: { cat: 'summary' | a category id, focus: an achievement id to light (a pager line opened it) }
import { glyph } from './glyphs.mjs';
import { achievements, CATEGORIES, pointsOf, totalPoints, progressOf, rewardText, terminalReward } from './achievements.mjs';
import { BOOT_LOOKS, PROMPTS, CURSORS } from './terminal.mjs';
import { titleById, stickerById, REWARD_BANNERS } from './profile.mjs';
import { COLORWAYS, PROPS, propSvg } from './casing.mjs';
import { districtMini } from './casing-view.mjs';
import { DISTRICTS } from './window.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dmy = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const view = (s) => ({ got: s.achievements?.got || {}, pins: s.achievements?.pins || [] }); // read only: a view never writes the save
const pct = (n, N) => (N ? Math.round((Math.min(n, N) / N) * 100) : 0);
const bar = (n, N, cls = '') => `<i class="ach-bar${cls ? ' ' + cls : ''}" aria-hidden="true"><b style="width:${pct(n, N)}%"></b></i>`;

// The tooltip: the name is the title, then the rule, what it brings and when it came (WoW's achievement tooltip).
export function achTip(s, a) {
  const S = s.achievements || {}, got = S.got?.[a.id];
  if (a.hidden && !got) return `???: ${a.hint}`;
  const p = !got && progressOf(a, s);
  return [`${a.name}: ${a.rule}`, p ? `${p[0]} of ${p[1]}.` : '', `${a.pts} points.`, rewardText(a), got ? `Earned ${dmy(got)}.` : ''].filter(Boolean).join(' ');
}
// A reward as itself: the title in its words, the sticker as it looks, the banner in miniature, the colourway as a
// swatch, the window's district as its skyline and the desk's prop as itself.
function rewardChips(a, open) {
  const r = a.reward || {}, out = [];
  if (r.title) out.push(`<span class="ach-rw ach-rw-title" title="${esc(`Title: ${titleById(r.title)?.name}`)}">${esc(titleById(r.title)?.name || '')}</span>`);
  if (r.sticker) { const x = stickerById(r.sticker); if (x) out.push(`<span class="ach-rw pf-sticker k-${x.kind}" style="--sc:${x.color}" title="${esc(`Sticker: ${x.tip}`)}">${glyph(x.glyph)}<b>${esc(x.label)}</b></span>`); }
  if (r.banner && REWARD_BANNERS[r.banner]) out.push(`<span class="ach-rw ach-rw-banner" title="${esc(`Banner: ${REWARD_BANNERS[r.banner].name}`)}"><pre aria-hidden="true">${esc(REWARD_BANNERS[r.banner].rows.join('\n'))}</pre><b>${esc(REWARD_BANNERS[r.banner].name)}</b></span>`);
  if (r.casing && COLORWAYS[r.casing]) out.push(`<span class="ach-rw ach-rw-case" data-case="${r.casing}" title="${esc(`Casing: ${COLORWAYS[r.casing].name}`)}"><i class="cs-chip" aria-hidden="true"></i><b>${esc(COLORWAYS[r.casing].name)}</b></span>`);
  if (r.district && DISTRICTS[r.district]) out.push(`<span class="ach-rw ach-rw-district" title="${esc(`Window: ${DISTRICTS[r.district].name}. ${DISTRICTS[r.district].tip}`)}">${districtMini(r.district)}<b>${esc(DISTRICTS[r.district].name)}</b></span>`);
  if (r.prop && PROPS[r.prop]) out.push(`<span class="ach-rw ach-rw-prop" title="${esc(`Desk: ${PROPS[r.prop].name}. ${PROPS[r.prop].tip}`)}">${propSvg(r.prop)}<b>${esc(PROPS[r.prop].name)}</b></span>`);
  const t = terminalReward(a.id) || {}; // a boot, a prompt, a cursor (terminal.mjs), by name
  if (t.boot && BOOT_LOOKS()[t.boot]) out.push(`<span class="ach-rw ach-rw-term" title="${esc(`Boot: ${BOOT_LOOKS()[t.boot].name}`)}"><b>${esc(BOOT_LOOKS()[t.boot].name)} boot</b></span>`);
  if (t.prompt && PROMPTS[t.prompt]) out.push(`<span class="ach-rw ach-rw-term" title="${esc(`Prompt: ${PROMPTS[t.prompt].name}`)}"><b>${esc(PROMPTS[t.prompt].name)} prompt</b></span>`);
  if (t.cursor && CURSORS[t.cursor]) out.push(`<span class="ach-rw ach-rw-term" title="${esc(`Cursor: ${CURSORS[t.cursor].name}`)}"><b>${esc(CURSORS[t.cursor].name)} cursor</b></span>`);
  return out.length ? `<span class="ach-rws${open ? '' : ' locked'}">${out.join('')}</span>` : '';
}
export function achRow(s, a, focus = null) {
  const S = view(s), got = S.got[a.id], hide = a.hidden && !got, p = !got && !hide && progressOf(a, s);
  const pinned = S.pins.includes(a.id);
  const cls = ['ach-row', got ? 'got' : p && p[0] > 0 ? 'part' : '', hide ? 'hidden' : '', focus === a.id ? 'focus' : ''].filter(Boolean).join(' ');
  const body = hide
    ? `<b class="ach-name">???</b><small class="ach-hint">${esc(a.hint)}</small>`
    : `<b class="ach-name">${esc(a.name)}</b>${p ? `<span class="ach-prog">${bar(p[0], p[1])}<small>${p[0]}/${p[1]}</small></span>` : ''}`;
  const side = got ? `<time datetime="${new Date(got).toISOString().slice(0, 10)}">${dmy(got)}</time><button type="button" class="act dim ach-pin" data-run="achieve ${pinned ? 'unpin' : 'pin'} ${esc(a.id)}" aria-pressed="${pinned}" title="${esc(pinned ? 'On your card. Unpin it.' : 'Pin it to your card.')}">${pinned ? 'Pinned' : 'Pin'}</button>` : '';
  return `<li class="${cls}" data-ach="${esc(a.id)}" title="${esc(achTip(s, a))}"><span class="ach-pts" aria-label="${a.pts} points">${glyph('medal')}<b>${a.pts}</b></span><div class="ach-body">${body}</div>${hide ? '' : rewardChips(a, !!got)}${side ? `<div class="ach-side">${side}</div>` : ''}</li>`;
}
const catStats = (s, id) => {
  const xs = achievements().filter((a) => id === 'all' || a.cat === id), got = xs.filter((a) => s.achievements?.got?.[a.id]);
  return { n: got.length, of: xs.length, pts: got.reduce((n, a) => n + a.pts, 0), all: xs.reduce((n, a) => n + a.pts, 0) };
};
// The list for a category, under its groups (Lairs, Floors, Sets, Tier sets) in the order they come.
function catList(s, cat, focus) {
  const xs = achievements().filter((a) => a.cat === cat), groups = [...new Set(xs.map((a) => a.group || ''))];
  return groups.map((g) => `${g ? `<h3 class="ach-group">${esc(g)}</h3>` : ''}<ul class="ach-list">${xs.filter((a) => (a.group || '') === g).map((a) => achRow(s, a, focus)).join('')}</ul>`).join('');
}
function summary(s, focus) {
  const S = view(s), recent = Object.entries(S.got).sort((a, b) => b[1] - a[1]).map(([id]) => achievements().find((a) => a.id === id)).filter(Boolean).slice(0, 6);
  // Nearly there: what has progress and is closest to done.
  const near = achievements().filter((a) => !S.got[a.id] && !a.hidden && a.progress).map((a) => ({ a, p: progressOf(a, s) })).filter((x) => x.p && x.p[0] > 0).sort((x, y) => y.p[0] / y.p[1] - x.p[0] / x.p[1]).slice(0, 4).map((x) => x.a);
  const tiles = CATEGORIES.map((c) => { const t = catStats(s, c.id); return `<button type="button" class="ach-tile" data-ach-cat="${c.id}" title="${esc(`${c.name}: ${t.n} of ${t.of} earned. ${t.pts} of ${t.all} points.`)}"><span>${esc(c.name)}</span><small>${t.n}/${t.of}</small>${bar(t.n, t.of)}</button>`; }).join('');
  return `<div class="ach-tiles">${tiles}</div>
    ${recent.length ? `<h3 class="ach-group">Recent</h3><ul class="ach-list">${recent.map((a) => achRow(s, a, focus)).join('')}</ul>` : ''}
    ${near.length ? `<h3 class="ach-group">Nearly there</h3><ul class="ach-list">${near.map((a) => achRow(s, a, focus)).join('')}</ul>` : ''}`;
}
export function achievementsMarkup(s, ui = {}) {
  const cat = ui.cat && (ui.cat === 'summary' || CATEGORIES.some((c) => c.id === ui.cat)) ? ui.cat : 'summary';
  const all = catStats(s, 'all');
  const nav = [`<button type="button" class="ach-cat" data-ach-cat="summary" aria-pressed="${cat === 'summary'}"><span>Summary</span><small>${all.n}/${all.of}</small>${bar(all.n, all.of)}</button>`,
    ...CATEGORIES.map((c) => { const t = catStats(s, c.id); return `<button type="button" class="ach-cat" data-ach-cat="${c.id}" aria-pressed="${cat === c.id}" title="${esc(`${c.name}: ${t.pts} of ${t.all} points.`)}"><span>${esc(c.name)}</span><small>${t.n}/${t.of}</small>${bar(t.n, t.of)}</button>`; })].join('');
  const head = cat === 'summary' ? { name: 'Achievements', ...all } : { name: CATEGORIES.find((c) => c.id === cat).name, ...catStats(s, cat) };
  return `<div class="ach-page"><nav class="ach-cats" aria-label="Categories">${nav}</nav>
    <section class="card ach-main"><header class="ach-head"><h2>${esc(head.name)}</h2><span class="ach-total" title="${esc(`Achievement points: ${cat === 'summary' ? pointsOf(s) : head.pts} of ${cat === 'summary' ? totalPoints() : head.all}`)}">${glyph('medal')}<b>${cat === 'summary' ? pointsOf(s) : head.pts}</b><small>/${cat === 'summary' ? totalPoints() : head.all}</small></span></header>
    ${cat === 'summary' ? summary(s, ui.focus) : catList(s, cat, ui.focus)}</section></div>`;
}

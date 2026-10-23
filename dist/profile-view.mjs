// Markup for #net (channel.mjs) and the profile card (profile.mjs). Pure functions of state.
import { esc } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { glyphMarkup } from './protocol-glyphs.mjs';
import { EMBLEMS } from './class-emblems.mjs';
import { ARCHETYPES } from './data.mjs';
import { FACTIONS } from './factions.mjs';
import { channelOf, muted } from './channel.mjs';
import { fingerOf, BANNERS, BANNER_IDS, titles, myProfile, shownTitle, PROFILE, hash } from './profile.mjs';
import { online, simOn, isFriend } from './presence.mjs';
import { achievements, totalPoints, bannersOf } from './achievements.mjs';
import { REWARD_BANNERS, REWARD_BANNER_IDS } from './profile.mjs';

const hhmm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
// [Item] in a line: a unique's name in its gold, the rest as written.
// [Achievement] (achievements.mjs): its name in amber, its rule on hover.
const linked = (l) => esc(l.text).replace(/\[([^\]]+)\]/g, (m, name) => {
  const raw = name.replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  if ((l.items || []).includes(raw)) return `<b class="ch-item" title="Unique">[${name}]</b>`;
  const a = (l.achs || []).includes(raw) && achievements().find((x) => x.name === raw);
  return a ? `<b class="ch-ach" title="${esc(`${a.name}: ${a.rule}`)}">[${name}]</b>` : m;
});
// Who said it: a hacker's handle opens their card; a contact wears its faction's mark and colour; the wire is the wire.
function who(s, l) {
  if (l.kind === 'wire') return '<span class="ch-from wire">wire</span>';
  if (l.kind === 'contact') return `<span class="ch-from contact" style="--fc:${FACTIONS[l.faction]?.color || 'inherit'}">${glyph('f-' + l.faction)}${esc(l.from)}</span>`;
  const cls = l.kind === 'you' || l.kind === 'feat' ? (l.from === (s.profile?.handle || 'rookie') ? ' me' : '') : isFriend(s, l.from) ? ' friend' : '';
  return `<button type="button" class="ch-from hacker${cls}" data-finger="${esc(l.from)}" title="finger ${esc(l.from)}">${esc(l.from)}</button>${l.title ? `<i class="ch-title">${esc(l.title)}</i>` : ''}`;
}
export function lineMarkup(s, l) {
  return `<li class="ch-line k-${l.kind}"><time>${hhmm(l.t)}</time>${l.kind === 'feat' ? '<span class="ch-star" aria-hidden="true">★</span>' : ''}${who(s, l)}<span class="ch-text">${linked(l)}</span></li>`;
}
// The line over the prompt: the latest thing said. Click it for the channel.
export function tickerMarkup(s) {
  const l = channelOf(s).lines.at(-1);
  return `<span class="nl-tag">#net</span>${l ? `<span class="nl-line">${lineMarkup(s, l).replace(/^<li[^>]*>|<\/li>$/g, '')}</span>` : '<span class="nl-line quiet">quiet</span>'}`;
}
export const channelLinesMarkup = (s) => channelOf(s).lines.map((l) => lineMarkup(s, l)).join('') || '<li class="ch-line quiet">Quiet on the net.</li>';
export const channelHead = (s) => `<span class="ch-name">#net</span><small>${simOn(s) ? `${online(s).length} online · simulated` : 'the wire and the hubs'}</small><span class="p-acts"><button type="button" class="act dim" data-run="channel ${muted(s) ? 'on' : 'off'}" title="${muted(s) ? 'Show #net\'s line over the prompt' : 'Hide #net\'s line over the prompt'}">${muted(s) ? 'Unmute' : 'Mute'}</button><button type="button" class="act" data-chan-close>Close</button></span>`;

// ---------- the card ----------
// Achievement points, then the few you pinned or earned last (achievements.mjs). Yours open the achievement.
const dmy = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const section = (label, body, head = '') => `<section class="pf-sec"><header class="pf-sec-h"><h3>${label}</h3>${head}</header>${body}</section>`;
function achSection(f) {
  if (f.points == null) return '';
  const when = f.you ? f.got || {} : {};
  const chip = (a) => {
    const tip = `${a.name}: ${a.rule}${when[a.id] ? ` Earned ${dmy(when[a.id])}.` : ''}`;
    return f.you ? `<button type="button" class="pf-ach-chip" data-go="achieve:${esc(a.id)}" title="${esc(tip)}">${glyph('medal')}<span>${esc(a.name)}</span></button>` : `<span class="pf-ach-chip" title="${esc(tip)}">${glyph('medal')}<span>${esc(a.name)}</span></span>`;
  };
  const pts = `<span class="pf-pts" title="${esc(`Achievement points: ${f.points}${f.you ? ` of ${totalPoints()}` : ''}`)}">${glyph('medal')}<b>${f.points}</b></span>`;
  return section('Achievements', (f.achievements || []).length ? `<div class="pf-achs">${f.achievements.map(chip).join('')}</div>` : '', pts);
}
const tierPips = (i) => `<span class="pf-pips" aria-hidden="true">${[1, 2, 3, 4].map((k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</span>`;
// The badge's bar code: drawn from the handle, so the same person always has the same one (decoration, no data).
function barcode(h) {
  let x = 0;
  const stops = [];
  for (let i = 0; i < 18; i++) {
    const w = 1 + Math.floor(hash(h, 100 + i) * 3), gap = 1 + Math.floor(hash(h, 200 + i) * 2);
    stops.push(`currentColor ${x}px ${x + w}px`, `transparent ${x + w}px ${x + w + gap}px`);
    x += w + gap;
  }
  return `<span class="pf-bars" aria-hidden="true" style="width:${x}px;background-image:linear-gradient(90deg,${stops.join(',')})"></span>`;
}
// The card as a net ID badge: an amber strip; a centred identity (the banner framed as the photo, the handle large in
// teal, the title, the plan quoted under them); then labelled sections on one column (classes; gear and marks;
// stickers; achievements); a bar code beside the date at the foot.
function cardBody(s, f) {
  const classes = f.classes.map((c) => `<figure class="pf-class" title="${esc(ARCHETYPES[c.cls].name)} level ${c.level}"><pre aria-hidden="true">${esc(EMBLEMS[c.cls].join('\n'))}</pre><figcaption>${esc(ARCHETYPES[c.cls].name)} <b>${c.level}</b></figcaption></figure>`).join('');
  const pieces = f.pieces.map((it) => `<span class="pf-piece" title="${esc(it.name)}">${glyphMarkup(it, 'sm')}</span>`).join('');
  const marks = f.marks.map((m) => `<span class="pf-mark" style="--fc:${FACTIONS[m.f].color}" title="${esc(`${FACTIONS[m.f].name}: ${FACTIONS[m.f].tiers[m.tier]}`)}">${glyph('f-' + m.f)}${tierPips(m.tier)}</span>`).join('');
  const stickers = f.stickers.map((x) => `<span class="pf-sticker k-${x.kind}" style="--sc:${x.color}" title="${esc(x.tip)}">${glyph(x.glyph)}<b>${esc(x.label)}</b></span>`).join('');
  const since = f.you && f.since ? `On since ${new Date(f.since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : f.where === 'offline' ? 'Not logged on' : `On ${f.where}`;
  const group = (label, body) => `<div class="pf-group"><h3>${label}</h3>${body}</div>`;
  return `<header class="pf-head"><span class="pf-kicker">Net ID</span><button type="button" class="act pf-x" data-profile-close aria-label="Close">×</button></header>
    <div class="pf-face"><div class="pf-photo"><pre class="pf-banner" aria-label="${esc(f.handle)}'s banner">${esc(f.banner.join('\n'))}</pre></div>
      <b class="pf-handle">${esc(f.handle)}</b>${f.title ? `<span class="pf-title">${esc(f.title)}</span>` : ''}
      <p class="pf-plan${f.plan ? '' : ' quiet'}" title="Plan">${f.plan ? `“${esc(f.plan)}”` : 'No plan.'}</p></div>
    ${section('Classes', `<div class="pf-classes">${classes}</div>`)}
    ${pieces || marks ? `<section class="pf-sec pf-groups">${pieces ? group('Gear', `<div class="pf-pieces">${pieces}</div>`) : ''}${marks ? group('Marks', `<div class="pf-marks">${marks}</div>`) : ''}</section>` : ''}
    ${stickers ? section('Stickers', `<div class="pf-stickers">${stickers}</div>`) : ''}
    ${achSection(f)}
    <footer class="pf-foot">${barcode(f.handle)}<span class="pf-since">${esc(since)}</span>${f.you ? '' : isFriend(s, f.handle) ? '<span class="tag">friend</span>' : `<button type="button" class="act" data-run="friend add ${esc(f.handle)}">Add friend</button>`}</footer>`;
}
// The editor beside your own card: banner (a preset, or your own drawing), title, plan.
function editor(s, tab, draft, err) {
  const p = myProfile(s), cur = Array.isArray(p.banner) ? 'own' : p.banner, shown = shownTitle(s);
  const tabs = [['banner', 'Banner'], ['title', 'Title'], ['plan', 'Plan']].map(([k, l]) => `<button type="button" data-pf-tab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('');
  let body = '';
  if (tab === 'banner') {
    // The twelve, then the achievements' five: earned ones to pick, the rest dim with the achievement on hover.
    const mine = bannersOf(s), from = (id) => achievements().find((a) => a.reward?.banner === id);
    const extra = REWARD_BANNER_IDS.map((id) => (mine.includes(id)
      ? `<button type="button" class="pf-preset" data-run="banner ${id}" aria-pressed="${cur === id}" title="${esc(`${REWARD_BANNERS[id].name}: from ${from(id)?.name}.`)}"><pre aria-hidden="true">${esc(REWARD_BANNERS[id].rows.join('\n'))}</pre></button>`
      : `<span class="pf-preset locked" title="${esc(`${REWARD_BANNERS[id].name}: comes with ${from(id)?.hidden ? 'a hidden achievement' : from(id)?.name}.`)}"><pre aria-hidden="true">${esc(REWARD_BANNERS[id].rows.join('\n'))}</pre>${glyph('lock')}</span>`)).join('');
    body = `<div class="pf-presets">${BANNER_IDS.map((id) => `<button type="button" class="pf-preset" data-run="banner ${id}" aria-pressed="${cur === id}" title="${esc(BANNERS[id].name)}"><pre aria-hidden="true">${esc(BANNERS[id].rows.join('\n'))}</pre></button>`).join('')}${extra}</div>
      <div class="pf-draw"><label for="pf-draw-box">Your own <small>${PROFILE.rows} × ${PROFILE.cols}</small></label><textarea id="pf-draw-box" class="pf-draw-box" rows="${PROFILE.rows}" cols="${PROFILE.cols}" spellcheck="false" autocapitalize="off" wrap="off">${esc(draft ?? (Array.isArray(p.banner) ? p.banner.join('\n') : ''))}</textarea>
      <div class="pf-draw-row">${err ? `<span class="pf-err">${esc(err)}</span>` : '<span></span>'}<button type="button" class="btn small primary" data-pf-draw>Use this</button></div></div>`;
  }
  if (tab === 'title') {
    const all = titles(), got = all.filter((t) => p.titles.includes(t.id)), not = all.filter((t) => !p.titles.includes(t.id));
    body = `<ul class="pf-titles">${got.map((t) => `<li><button type="button" class="pf-tl" data-run="title ${t.id}" aria-pressed="${shown?.id === t.id}" title="${esc(t.rule)}">${esc(t.name)}</button></li>`).join('')}<li><button type="button" class="pf-tl none" data-run="title off" aria-pressed="${!shown}">No title</button></li>${not.map((t) => `<li><span class="pf-tl locked" title="${esc(t.rule)}">${glyph('lock')}${esc(t.name)}</span></li>`).join('')}</ul>`;
  }
  if (tab === 'plan') body = `<form class="pf-planform" data-pf-plan><input id="pf-plan-in" maxlength="${PROFILE.plan}" value="${esc(p.plan)}" placeholder="One line, ${PROFILE.plan} characters" spellcheck="false" autocomplete="off"><button type="submit" class="btn small primary">Save</button></form>`;
  return `<aside class="pf-edit"><div class="comms-filters" role="group" aria-label="Edit">${tabs}</div>${body}</aside>`;
}
// finger <handle>: the card. Yours has its editor beside it (tab: banner, title or plan).
export function profileMarkup(s, handle, { tab = 'banner', draft = null, err = null } = {}) {
  const f = fingerOf(s, handle);
  if (!f) return '';
  return `<div class="pf-wrap${f.you ? ' mine' : ''}"><article class="pf-card" aria-label="${esc(f.handle)}">${cardBody(s, f)}</article>${f.you ? editor(s, tab, draft, err) : ''}</div>`;
}

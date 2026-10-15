// The Codex tab (codex.mjs is the model): an index on the left, grouped, and the entry you picked on the right. Names,
// numbers and terse lines in tooltip grammar (docs/style-guide.md); ??? for anything you haven't met or decoded. Teal
// is only ever you: your kills, your level. On a phone the index folds into a bar over the entry (app.js codexIdx).
// The entry's art is a canvas (#cx-canvas) that app.js draws with the fight board's renderer (virus-art.mjs).
import { esc, codexMarkup } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { AUTHORS } from './authors.mjs';
import { STRAINS, FAMILIES, ROOM_FAMILIES, GUARDS } from './data.mjs';
import { attackAmount } from './combat.mjs';
import { partRead } from './fightread.mjs';
import { entries, entryOf, validKey, firstKey, tellKind, SET_CYCLES } from './codex.mjs';

const UNKNOWN = '???';
const every = (n) => (n >= 900 ? 'once' : n === 1 ? 'every cycle' : `every ${n} cycles`);
const byline = (a) => (AUTHORS[a] ? `<span class="byline" style="--ac:${AUTHORS[a].colour}" title="${esc(AUTHORS[a].style)}">${esc(AUTHORS[a].name)}</span>` : '');
const famName = (id) => FAMILIES[id]?.name || ROOM_FAMILIES[id]?.name || GUARDS[id]?.name || id;
const link = (key, text) => `<button type="button" class="cx-link" data-codex="${esc(key)}">${esc(text)}</button>`;

// ---------- the index ----------
function indexMarkup(groups, sel) {
  return groups.map((g) => `<section class="cx-grp" aria-label="${esc(g.name)}"><h3><span>${esc(g.name)}</span><small>${g.group === 'gene' ? '' : `${g.met}/${g.rows.length}`}</small></h3><ul>${g.rows.map((r) => {
    const n = r.count ? `<small class="cx-n${r.count.n >= r.count.of ? ' full' : ''}" title="${esc(r.group === 'mutation' ? 'Kills toward its decode' : r.group === 'gene' ? 'Genes decoded' : 'Parts decoded')}">${r.count.n}/${r.count.of}</small>` : r.note ? `<small class="cx-n">${esc(r.note)}</small>` : '';
    return `<li><button type="button" class="cx-row${r.known ? '' : ' unknown'}${r.key === sel ? ' on' : ''}" data-codex="${esc(r.key)}" aria-current="${r.key === sel ? 'true' : 'false'}"><span class="cx-ico" aria-hidden="true">${r.known ? glyph(r.icon) : '<i class="cx-none"></i>'}</span><span class="cx-name">${esc(r.name || UNKNOWN)}</span>${n}</button></li>`;
  }).join('')}</ul></section>`).join('');
}

// ---------- a body's page ----------
// What a part's attack does at your level, as the attack line's number.
function hitLine(p) {
  const a = p.attack;
  if (!a) return 'No attack';
  if (a.effect === 'encrypt') return `+${a.amount} encryption`;
  if (a.effect === 'replicate') return a.hit ? `${a.hit} damage + a fragment` : 'a fragment';
  if (a.effect === 'scramble') return `${a.hit || 0} damage + Scramble ${a.amount}`;
  if (a.effect === 'heal') return `heals ${a.amount}`;
  return `${attackAmount(p)} damage`;
}
function partCard(level, x) {
  // Lv N+: a third part (it joins viruses of that level and up), or a part whose body comes later than your level (its numbers are at N).
  const p = x.part, later = x.level > level, opens = (x.gene && x.from > 1) || later ? `<span class="tag dim" title="${esc(`${x.gene ? `Joins viruses of level ${x.from} and up.` : `Comes at level ${x.from} and up.`}${later ? ` Its numbers are at level ${x.level}.` : ''}`)}">Lv ${x.from}+</span>` : '';
  if (!x.known) {
    return `<div class="cx-part unknown"><div class="cxp-head"><b>${esc(x.named ? x.spec.name : UNKNOWN)}</b>${x.named ? opens : ''}</div><div class="cxp-stats"><span>${UNKNOWN} Integrity</span><span>◆ ${UNKNOWN}</span></div><p class="cxp-does">${UNKNOWN}</p><p class="cxp-hint">Break one to decode it.</p></div>`;
  }
  const r = partRead(null, x.virus, p), a = p.attack;
  const atk = a ? `<div class="cxp-atk"><b>${esc(a.name)}</b><span class="cxp-dmg">${esc(hitLine(p))}</span><span class="cxp-when">${esc(a.due >= 900 ? 'when it wakes' : `${every(a.interval)} · first on ${a.due}`)}</span></div>` : `<div class="cxp-atk none"><b>No attack</b></div>`;
  return `<div class="cx-part"><div class="cxp-head"><b>${esc(p.name)}</b>${p.special ? '<span class="tag" title="Its family\'s signature part">signature</span>' : ''}${opens}</div>
    <div class="cxp-stats"><span><b>${p.max}</b> Integrity</span><span title="${p.maxArmor ? `${p.maxArmor} ◆: each hit that lands breaks one before it does damage` : 'No armor'}">${p.maxArmor ? `◆ <b>${p.maxArmor}</b>` : 'no ◆'}</span>${p.veiled ? '<span class="tag dim" title="Hides its timers while it wears ◆">veiled</span>' : ''}</div>
    ${atk}<p class="cxp-does">${esc(r.does)}</p><p class="cxp-answer">${esc(r.answer)}</p>${p.loot ? `<p class="cxp-loot">${glyph('salvage')}Drops ${esc(p.loot)}</p>` : ''}</div>`;
}
function setMarkup(x) {
  if (!x.faced) return `<div class="cx-set unknown"><div class="cxs-head"><b>${UNKNOWN}</b><small>Face it in a room to learn its timing.</small></div></div>`;
  const head = `<div class="cxs-row cxs-cycles" aria-hidden="true"><span class="cxs-name"></span>${Array.from({ length: SET_CYCLES }, (_, i) => `<i>${i + 1}</i>`).join('')}</div>`;
  const rows = x.rows.map((r) => {
    const tip = (c) => `Cycle ${c}: ${r.attack}${r.effect === 'deliver' ? 's a Package' : r.amount ? ` for ${r.amount}` : ''}`;
    return `<div class="cxs-row"><span class="cxs-name" title="${esc(`${r.name}: ${r.attack}, ${every(r.interval)}, first on cycle ${r.first}${r.mult !== 1 ? `, ×${r.mult} damage` : ''}`)}">${esc(r.effect === 'deliver' ? `${r.name} ▸ box` : r.name)}${r.mult !== 1 ? `<em>×${r.mult}</em>` : ''}</span>${Array.from({ length: SET_CYCLES }, (_, i) => (r.cycles.includes(i + 1) ? `<i class="m${r.effect === 'deliver' ? ' dlv' : ''}" title="${esc(tip(i + 1))}"></i>` : '<i></i>')).join('')}</div>`;
  }).join('');
  const label = x.rows.map((r) => `${r.name} ${r.attack} on ${r.cycles.join(', ') || 'none'}`).join('. ');
  return `<div class="cx-set"><div class="cxs-head"><b>${esc(x.name)}</b><small>${x.both ? 'Both lead' : x.lead ? `${esc(x.lead)} leads` : ''}${x.heat ? ` · heat ×${x.heat}` : ''}</small>${x.by.length ? `<span class="cxs-by">${x.by.map(byline).join('')}</span>` : ''}</div><div class="cxs-strip" role="img" aria-label="${esc(`${x.name}: ${label}.`)}">${head}${rows}</div></div>`;
}
// When it comes: Lv N+, or only on an elite (one more tell than a plain virus of its level).
const tellLv = (t) => (t.level == null && t.elite == null ? '' : t.level != null ? `<span class="tag dim" title="Viruses of level ${t.level} and up bring it">Lv ${t.level}+</span>` : `<span class="tag dim" title="Only an elite brings it, from level ${t.elite}">elite Lv ${t.elite}+</span>`);
function tellMarkup(t) {
  if (!t.seen) return `<li class="cx-tell unknown"><div class="cxt-head"><b>${UNKNOWN}</b>${tellLv(t)}</div><p class="cxp-hint">Meet it in a fight to learn it.</p></li>`;
  return `<li class="cx-tell"><div class="cxt-head"><b>${esc(t.name)}</b><span class="tag hot">${esc(tellKind(t.kind))}</span>${t.part ? `<small>on the ${esc(t.part)}</small>` : ''}${tellLv(t)}</div><p class="cxp-does">${esc(t.does)}</p><p class="cxp-answer">${esc(t.answer)}</p></li>`;
}
const section = (title, body, extra = '') => `<section class="cx-sec"><h3 class="cx-kick">${title}${extra}</h3>${body}</section>`;
const stat = (label, value, cls = '', title = '') => `<div class="stat"${title ? ` title="${esc(title)}"` : ''}><span>${esc(label)}</span><strong class="${cls}">${value}</strong></div>`;
function bodyPage(s, e) {
  const groupName = { family: 'Family', strain: 'Strain', guard: e.ice ? 'ICE' : 'Guard' }[e.group];
  const known = e.parts.filter((x) => x.known).length;
  const tags = [e.stem ? `<span class="tag" title="Its viruses' names">${esc(e.stem)}</span>` : '', e.threatens ? `<span class="tag" title="What it hits">hits ${esc(e.threatens)}</span>` : '', e.opens ? `<span class="tag dim" title="It comes at level ${e.opens} and up${e.depth ? `, on servers ${e.depth} layers deep and deeper` : ''}">Lv ${e.opens}+${e.depth ? ` · layer ${e.depth}+` : ''}</span>` : '', e.lineage ? link(`family:${e.lineage}`, `${famName(e.lineage)} lineage`) : ''].filter(Boolean).join('');
  const faced = e.sets.filter((x) => x.faced).length;
  const head = `<header class="cx-head"><div class="cx-art" aria-hidden="true"><canvas id="cx-canvas" data-art="${esc(e.art?.id || '')}"></canvas></div><div class="cx-title"><h2>${groupName}</h2><h1>${esc(e.name)}</h1><p class="tagline">${tags}</p>
    <div class="stats">${stat('Your kills', e.kills, 'you')}${stat('Parts decoded', `${known}/${e.parts.length}`)}${e.sets.length ? stat('Sets faced', `${faced}/${e.sets.length}`) : ''}</div>
    ${e.authors.length ? `<p class="cx-by"><span class="cx-label">Written by</span>${e.authors.map(byline).join('')}</p>` : ''}</div></header>`;
  const rule = e.rule ? `<p class="cx-rule"${e.ice ? ' title="ICE: its rule shows as a tag in the fight"' : ''}>${esc(e.rule)}</p>` : '';
  const parts = section('Parts', `<div class="cx-parts">${e.parts.map((x) => partCard(e.level, x)).join('')}</div>`, ` <small>at <b class="you">Lv ${e.level}</b></small>`);
  const sets = e.sets.length ? section('Attack sets', `<div class="cx-sets">${e.sets.map(setMarkup).join('')}</div><p class="cx-foot">Each fight rolls its set, and nudges every part's first attack by up to 1 cycle.</p>`) : '';
  const tells = section('Tells', e.tells.length ? `<ul class="cx-tells">${e.tells.map(tellMarkup).join('')}</ul>` : '<p class="cx-foot">Brings no tells.</p>');
  const loot = section('Loot', `<ul class="cx-loot">${e.parts.filter((x) => x.spec.loot).map((x) => `<li class="${x.known ? '' : 'unknown'}">${glyph('salvage')}<b>${esc(x.known ? x.spec.loot : UNKNOWN)}</b><small>${esc(x.named ? x.spec.name : UNKNOWN)}</small></li>`).join('')}</ul>`);
  return head + rule + parts + sets + tells + loot;
}

// ---------- the other pages ----------
function bossPage(s, e) {
  const fam = e.strain ? link(`strain:${e.strain}`, STRAINS[e.strain].name) : e.family ? link(`family:${e.family}`, famName(e.family)) : '<span class="tag dim">the server\'s family</span>';
  const head = `<header class="cx-head solo"><div class="cx-title"><h2>${e.raid ? 'Crew boss' : 'Boss'}</h2><h1>${esc(e.name)}</h1><p class="tagline">${fam}${e.floor ? `<span class="tag dim">Lv ${e.floor}+</span>` : ''}${e.lair ? `<span class="tag" title="Its lair">${esc(e.lair)}</span>` : ''}</p>
    <div class="stats">${stat('Your fights', e.fought, 'you')}${stat('Your wins', e.won, 'you')}${stat('Integrity', `×${e.hp}`, '', 'Its Integrity, against a plain virus of its level')}${stat('Enrages', `cycle ${e.enrageAt}`, '', 'From this cycle every attack lands every cycle, a quarter harder')}</div>
    ${e.authors.length ? `<p class="cx-by"><span class="cx-label">Written by</span>${e.authors.map(byline).join('')}</p>` : ''}</div></header>`;
  const about = e.about ? `<p class="cx-rule">${esc(e.about)}</p>` : '';
  const sig = e.signature ? section('Signature', `<div class="cx-part"><div class="cxp-head"><b>${esc(e.signature.name)}</b></div><p class="cxp-does">${esc(e.signature.rule)}</p></div>`) : '';
  const phases = e.phases.length ? section('Phases', `<ol class="cx-phases">${e.phases.map((ph) => `<li><b class="cxph-at">${Math.round(ph.at * 100)}%</b><div>${ph.name ? `<b>${esc(ph.name)}</b>` : ''}${ph.say ? `<p>${esc(ph.say)}</p>` : ''}${ph.mechs ? `<p class="cxph-mechs">${ph.mechs.map((m) => `<span class="tag">${esc(m)}</span>`).join('')}</p>` : ''}</div></li>`).join('')}</ol>${e.enrage ? `<p class="cx-foot">Past its timer: ${esc(e.enrage)}.</p>` : ''}`) : '';
  const tells = e.raid ? '' : section('Tells', e.tells.length ? `<ul class="cx-tells">${e.tells.map(tellMarkup).join('')}</ul>` : '<p class="cx-foot">Brings no tells.</p>', ` <small>at <b class="you">Lv ${e.level}</b></small>`);
  const loot = e.uniques.length ? section('Loot', `<ul class="cx-loot">${e.uniques.map((u) => `<li class="${u.name ? '' : 'unknown'}">${glyph('item')}<b>${esc(u.name || UNKNOWN)}</b><small>Lv ${u.level}</small></li>`).join('')}</ul>`) : '';
  return head + about + sig + phases + tells + loot;
}
function mutationPage(s, e) {
  const head = `<header class="cx-head solo"><div class="cx-title"><h2>Mutation</h2><h1>${esc(e.name)}</h1><p class="tagline"><span class="tag" style="--ax:${e.axis.colour}" title="${esc(`${e.axis.name}: it punishes ${e.axis.punishes}.`)}">${glyph(e.axis.icon)}${esc(e.axis.name)}</span><span class="tag dim">Lv ${e.opens}+</span></p>
    <div class="stats">${stat('Kills of it', `${e.kills}/2`, 'you', 'Two kills of a virus that carries it decode it')}</div></div></header>`;
  const rule = `<div class="cx-part"><div class="cxp-head"><b>${esc(e.name)}</b></div><p class="cxp-does">${esc(e.rule)}</p>${e.decoded ? `<p class="cxp-tele">${glyph('ids')}${esc(e.telegraph)}</p><p class="cxp-answer">${esc(e.answer)}</p>` : '<p class="cxp-hint">Beat two viruses that carry it to decode the answer.</p>'}</div>`;
  const on = section('Seen on', e.on.length ? `<p class="cx-chips">${e.on.map((n) => `<span class="tag">${esc(n)}</span>`).join('')}</p>` : '<p class="cx-foot">Any wild virus can roll it.</p>');
  return head + section('Rule', rule) + on;
}

function entryMarkup(s, key, groups) {
  const e = entryOf(s, key);
  if (!e.known) {
    const g = { family: 'Family', strain: 'Strain', guard: 'Guard', boss: 'Boss', mutation: 'Mutation' }[e.group] || '';
    const how = e.group === 'boss' ? 'Fight it to fill this page.' : 'Meet one to fill this page.';
    return `<header class="cx-head solo"><div class="cx-title"><h2>${g}</h2><h1 class="unknown">${UNKNOWN}</h1><p class="cxp-hint">${how}</p></div></header>`;
  }
  if (e.group === 'boss') return bossPage(s, e);
  if (e.group === 'mutation') return mutationPage(s, e);
  if (e.group === 'gene') {
    const row = groups.find((g) => g.id === 'gene').rows.find((r) => r.id === e.cat);
    return `<header class="cx-head solo"><div class="cx-title"><h2>Genes</h2><h1>${esc(e.name)}</h1><div class="stats">${stat('Decoded', `${row.count.n}/${row.count.of}`, 'you')}</div></div></header>${codexMarkup(s, e.cat).replace('class="card codex-card"', 'class="codex-card cx-genes"')}`;
  }
  return bodyPage(s, e);
}

// The page. sel: the entry picked (app.js codexSel), idx: the phone's index open.
export function codexPageMarkup(s, sel = null, idx = false) {
  const key = validKey(sel) ? sel : firstKey(s);
  const groups = entries(s), cur = groups.flatMap((g) => g.rows).find((r) => r.key === key);
  const html = `<div class="cx-page${idx ? ' idx-open' : ''}">
    <nav class="cx-index card" aria-label="Codex index"><button type="button" class="cx-fold" data-codex-fold aria-expanded="${idx}"><span class="cx-label">Index</span><b>${esc(cur?.name || UNKNOWN)}</b><span class="cx-caret" aria-hidden="true">${idx ? '▴' : '▾'}</span></button><div class="cx-groups">${indexMarkup(groups, key)}</div></nav>
    <article class="cx-entry card" aria-label="Codex entry" data-entry="${esc(key)}">${entryMarkup(s, key, groups)}</article></div>`;
  return html;
}
export { entryOf as codexEntry };

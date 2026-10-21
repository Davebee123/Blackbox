// The Codex tab (codex.mjs is the model): an index on the left, grouped, and the entry you picked on the right. Names,
// numbers and terse lines in tooltip grammar (docs/style-guide.md); ??? for anything you haven't met or researched,
// with what unlocks it. Each part card carries its research (research.mjs) as a bar with marks at 3, 15 and 60. Teal
// is only ever you: your kills, your level. On a phone the index folds into a bar over the entry (app.js codexIdx).
// The entry's art is a canvas (#cx-canvas) that app.js draws with the fight board's renderer (virus-art.mjs).
import { esc, masteredMark } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { AUTHORS } from './authors.mjs';
import { STRAINS, FAMILIES, ROOM_FAMILIES, GUARDS } from './data.mjs';
import { attackAmount } from './combat.mjs';
import { partRead } from './fightread.mjs';
import { entries, entryOf, validKey, firstKey, tellKind, SET_CYCLES } from './codex.mjs';
import { RESEARCH, TIER } from './research.mjs';
import { refOf, refBody, unlocked } from './routines.mjs';

const UNKNOWN = '???';
const every = (n) => (n >= 900 ? 'once' : n === 1 ? 'every cycle' : `every ${n} cycles`);
const byline = (a) => (AUTHORS[a] ? `<span class="byline" style="--ac:${AUTHORS[a].colour}" title="${esc(AUTHORS[a].style)}">${esc(AUTHORS[a].name)}</span>` : '');
const famName = (id) => FAMILIES[id]?.name || ROOM_FAMILIES[id]?.name || GUARDS[id]?.name || id;
const link = (key, text) => `<button type="button" class="cx-link" data-codex="${esc(key)}">${esc(text)}</button>`;

// ---------- the index ----------
// A row's small count: a body's research % (amber at 100%), a mutation's kills toward its decode, a boss's wins.
function rowCount(r) {
  if (r.pct != null) return `<small class="cx-n${r.pct >= 100 ? ' full' : ''}" title="The average research of its parts">${r.pct}%</small>`;
  if (r.count) return `<small class="cx-n${r.count.n >= r.count.of ? ' full' : ''}" title="Kills toward its decode">${r.count.n}/${r.count.of}</small>`;
  return r.note ? `<small class="cx-n">${esc(r.note)}</small>` : '';
}
function indexMarkup(groups, sel) {
  return groups.map((g) => `<section class="cx-grp" aria-label="${esc(g.name)}"><h3><span>${esc(g.name)}</span><small>${g.met}/${g.rows.length}</small></h3><ul>${g.rows.map((r) => {
    return `<li><button type="button" class="cx-row${r.known ? '' : ' unknown'}${r.key === sel ? ' on' : ''}" data-codex="${esc(r.key)}" aria-current="${r.key === sel ? 'true' : 'false'}"><span class="cx-ico" aria-hidden="true">${r.known ? glyph(r.icon) : '<i class="cx-none"></i>'}</span><span class="cx-name">${esc(r.name || UNKNOWN)}</span>${rowCount(r)}</button></li>`;
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
// What it hits, before you've decoded it (research 0): its attack's kind, no numbers.
function hitsWord(p) {
  const a = p?.attack;
  if (!a) return 'No attack';
  const what = { encrypt: 'encrypts you', replicate: 'spawns fragments', scramble: 'hits and scrambles you', heal: 'heals its parts' }[a.effect] || 'hits you';
  return `${a.name} · ${what}`;
}
// Its research: a bar of 60 with marks at 3, 15 and 60 (each lit once reached), and n/60.
function researchBar(n) {
  const marks = RESEARCH.tiers.map((t) => `<i class="cxr-mk${n >= t ? ' on' : ''}" style="left:${(t / RESEARCH.max) * 100}%" title="${esc(t === TIER.decoded ? `Research ${t}: its numbers` : t === TIER.rule ? `Research ${t}: its rule, its answer and its tells` : `Research ${t}: its loot and its mastery`)}"></i>`).join('');
  return `<div class="cxp-res" title="${esc(`Research ${n}/${RESEARCH.max}. Break it +${RESEARCH.points.break}, cut its move with a tick +${RESEARCH.points.cut}, answer a tell it rides +${RESEARCH.points.tell}.`)}"><span class="cx-label">Research</span><span class="cxr-bar"><b style="width:${(Math.min(n, RESEARCH.max) / RESEARCH.max) * 100}%"></b>${marks}</span><small class="cxr-n${n >= RESEARCH.max ? ' full' : ''}">${n}/${RESEARCH.max}</small></div>`;
}
const locked = (text) => `<p class="cxp-lock"><span>${UNKNOWN}</span>${esc(text)}</p>`;
const TELL_VERB = { charge: 'Charges', cast: 'Casts', seal: 'Seals with', lock: 'Locks with' };
function partCard(level, x, tells = [], withHandler = false) {
  // Lv N+: a third part (it joins viruses of that level and up), or a part whose body comes later than your level (its numbers are at N).
  const p = x.part, later = x.level > level, opens = ((x.gene || x.basic) && x.from > 1) || later ? `<span class="tag dim" title="${esc(`${x.gene || x.basic ? `Joins viruses of level ${x.from} and up.` : `Comes at level ${x.from} and up.`}${later ? ` Its numbers are at level ${x.level}.` : ''}`)}">Lv ${x.from}+</span>` : '';
  if (!x.named) {
    return `<div class="cx-part unknown"><div class="cxp-head"><b>${UNKNOWN}</b></div><div class="cxp-stats"><span>${UNKNOWN} Integrity</span><span>◆ ${UNKNOWN}</span></div><p class="cxp-hint">Meet one to learn its name.</p></div>`;
  }
  const n = x.research, mast = n >= RESEARCH.max, a = p?.attack;
  const head = `<div class="cxp-head"><b>${esc(p?.name || x.spec.name)}${mast ? masteredMark(p || x.spec) : ''}</b>${p?.special ? '<span class="tag" title="Its family\'s signature part">signature</span>' : ''}${opens}</div>`;
  const bar = researchBar(n);
  if (!x.known) {
    return `<div class="cx-part t0">${head}${bar}<p class="cxp-hits">${esc(hitsWord(p))}</p><div class="cxp-stats"><span>${UNKNOWN} Integrity</span><span>◆ ${UNKNOWN}</span></div>${locked(`Research ${TIER.decoded} to learn its numbers. Break one, cut it or answer its tell.`)}</div>`;
  }
  const atk = a ? `<div class="cxp-atk"><b>${esc(a.name)}</b><span class="cxp-dmg">${esc(hitLine(p))}</span><span class="cxp-when">${esc(a.due >= 900 ? 'when it wakes' : `${every(a.interval)} · first on ${a.due}`)}</span></div>` : `<div class="cxp-atk none"><b>No attack</b></div>`;
  const stats = `<div class="cxp-stats"><span><b>${p.max}</b> Integrity</span><span title="${p.maxArmor ? `${p.maxArmor} ◆: each hit that lands breaks one before it does damage` : 'No armor'}">${p.maxArmor ? `◆ <b>${p.maxArmor}</b>` : 'no ◆'}</span>${p.veiled ? '<span class="tag dim" title="Hides its timers while it wears ◆">veiled</span>' : ''}</div>`;
  let rule;
  if (n >= TIER.rule) {
    const r = partRead(null, x.virus, p, { tells: false });
    const rides = tells.length ? `<p class="cxp-rides">${tells.map((t) => `${TELL_VERB[t.kind] || 'Brings'} <b>${esc(t.name)}</b>${t.level ? ` <small>Lv ${t.level}+</small>` : t.elite ? ` <small>elite Lv ${t.elite}+</small>` : ''}.`).join(' ')}</p>` : '';
    rule = `<p class="cxp-does">${esc(r.does)}</p><p class="cxp-answer">${esc(r.answer)}</p>${rides}`;
  } else rule = locked(`Research ${TIER.rule} to learn its rule, its answer and its tells.`);
  const loot = !p.loot ? '' : mast ? `<p class="cxp-loot">${glyph('salvage')}Drops ${esc(p.loot)}</p>` : locked(`Research ${RESEARCH.max} to learn its drop.`);
  const perk = mast ? `<p class="cxp-perk">Mastered. Its component drops ${Math.round((RESEARCH.perk.drop - 1) * 100)}% more often, and you deal ${Math.round((RESEARCH.perk.dmg - 1) * 100)}% more damage to it.</p>` : '';
  // A handler for it (routines.mjs, from level 5): the Program tab opens on its virus, with a handler on this part.
  const ref = refOf(x.virus, p);
  const handler = withHandler ? `<button type="button" class="btn small cx-handler" data-rt-goto="program ${esc(refBody(ref))} add ${esc(ref)}:present" title="${esc(`Add a handler for the ${p.name} to its virus's routine`)}">${glyph('chain')}+ handler</button>` : '';
  return `<div class="cx-part t${x.tier}${mast ? ' mastered' : ''}">${head}${bar}${stats}${atk}${rule}${loot}${perk}${handler}</div>`;
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
  const groupName = { family: 'Family', strain: 'Strain', guard: e.ice ? 'ICE' : 'Guard', runner: 'Exfil' }[e.group];
  const tags = [e.stem ? `<span class="tag" title="Its viruses' names">${esc(e.stem)}</span>` : '', e.threatens ? `<span class="tag" title="What it hits">hits ${esc(e.threatens)}</span>` : '', e.opens ? `<span class="tag dim" title="It comes at level ${e.opens} and up${e.depth ? `, on servers ${e.depth} layers deep and deeper` : ''}">Lv ${e.opens}+${e.depth ? ` · layer ${e.depth}+` : ''}</span>` : '', e.lineage ? link(`family:${e.lineage}`, `${famName(e.lineage)} lineage`) : ''].filter(Boolean).join('');
  const faced = e.sets.filter((x) => x.faced).length;
  const head = `<header class="cx-head"><div class="cx-art" aria-hidden="true"><canvas id="cx-canvas" data-art="${esc(e.art?.id || '')}"></canvas></div><div class="cx-title"><h2>${groupName}</h2><h1>${esc(e.name)}</h1><p class="tagline">${tags}</p>
    <div class="stats">${stat('Your kills', e.kills, 'you')}${stat('Research', `${e.research}%`, e.research >= 100 ? 'full' : '', 'The average of its parts\' research')}${e.sets.length ? stat('Sets faced', `${faced}/${e.sets.length}`) : ''}</div>
    ${e.authors.length ? `<p class="cx-by"><span class="cx-label">Written by</span>${e.authors.map(byline).join('')}</p>` : ''}</div></header>`;
  const rule = e.rule ? `<p class="cx-rule"${e.ice ? ' title="ICE: its rule shows as a tag in the fight"' : ''}>${esc(e.rule)}</p>` : '';
  const ridesOf = (x) => e.tells.filter((t) => t.part && t.part === (x.part?.name || x.spec.name)).map((t) => ({ name: t.name, kind: t.kind, level: t.level, elite: t.elite }));
  const parts = section('Parts', `<div class="cx-parts">${e.parts.map((x) => partCard(e.level, x, ridesOf(x), unlocked(s))).join('')}</div>`, ` <small>at <b class="you">Lv ${e.level}</b></small>`);
  const sets = e.sets.length ? section('Attack sets', `<div class="cx-sets">${e.sets.map(setMarkup).join('')}</div><p class="cx-foot">Each fight rolls its set, and nudges every part's first attack by up to 1 cycle.</p>`) : '';
  const tells = section('Tells', e.tells.length ? `<ul class="cx-tells">${e.tells.map(tellMarkup).join('')}</ul>` : '<p class="cx-foot">Brings no tells.</p>');
  const loot = section('Loot', lootList(e.parts) + (e.setLoot ? setLootTable(e.setLoot) : ''), ` <small>at research ${RESEARCH.max}</small>`);
  return head + rule + parts + sets + tells + loot;
}
// A guard's set pieces (sets.mjs, combat.mjs guardSetTable): ??? until found, on its floors, and the next kill's chance
// with its pity while you lack one (BOSS_LOOT's pattern, in the boss's words), a flat chance once you have them all.
function setLootTable(t) {
  const rows = t.pieces.map((u) => `<li class="${u.name ? '' : 'unknown'}">${glyph('item')}<b${u.name ? ' class="iname r-zeroday"' : ''}>${esc(u.name || UNKNOWN)}</b><small>floor ${t.floor}+${u.got ? ' · found' : ''}</small></li>`).join('');
  const odds = t.lacking
    ? `<p class="cx-foot" title="${esc(`A ${t.name} piece: ${pc(t.base)} a kill on floor ${t.floor} and below, +${pc(t.pity)} for each kill without one, back to ${pc(t.base)} when one drops.`)}">${esc(t.name)}: ${pc(t.base)} a kill, +${pc(t.pity)} a miss. Next kill <b class="you">${pc(t.chance)}</b>.</p>`
    : `<p class="cx-foot" title="Found. It still drops now and then, at your level.">${esc(t.name)}: found. ${pc(t.found)} a kill.</p>`;
  return `<ul class="cx-loot">${rows}</ul>${odds}`;
}

// The pieces its parts drop: each one ??? until that part is at research 60 (mastered).
const lootList = (parts) => `<ul class="cx-loot">${parts.filter((x) => x.spec.loot).map((x) => { const open = x.research >= RESEARCH.max; return `<li class="${open ? '' : 'unknown'}">${glyph('salvage')}<b>${esc(open ? x.spec.loot : UNKNOWN)}</b><small>${esc(x.named ? x.spec.name : UNKNOWN)}</small></li>`; }).join('')}</ul>`;
const pctOf = (parts) => (parts.length ? Math.round((parts.reduce((n, x) => n + Math.min(x.research, RESEARCH.max) / RESEARCH.max, 0) / parts.length) * 100) : 0);

// A boss's loot table (the dungeon journal): what every kill drops, its uniques (??? until found, a native boss's until
// its first fall names them), and their odds with the bad-luck protection: the next kill's chance, in amber.
const pc = (x) => `${Math.round(x * 100)}%`;
function lootTable(t) {
  const sure = t.sure === 'custom' ? `<li>${glyph('item')}<b class="iname r-custom">Custom</b><small>every kill, at its level</small></li>`
    : t.sure ? `<li>${glyph('item')}<b class="iname r-tuned">Tuned</b><small>every kill, at its level · Custom ${pc(t.yellow)}</small></li>`
    : `<li>${glyph('item')}<b>Like an elite</b><small>no sure drop</small></li>`;
  const gold = t.gold ? `<li>${glyph('item')}<b class="iname r-zeroday">A world unique</b><small>${pc(t.gold)} a kill</small></li>` : '';
  const own = t.uniques.map((u) => `<li class="${u.name ? '' : 'unknown'}">${glyph('item')}<b${u.name ? ' class="iname r-zeroday"' : ''}>${esc(u.name || UNKNOWN)}</b><small>Lv ${u.level}${u.got ? ' · found' : ''}</small></li>`).join('');
  const odds = t.done ? `<p class="cx-foot">Uniques: both found. It drops each only once, so it drops only as an elite now.</p>` : t.uniques.length || t.native ? `<p class="cx-foot" title="${esc(`${pc(t.base)} a kill, +${pc(t.pity)} for each kill without one, back to ${pc(t.base)} when one drops.`)}">${t.native ? 'Native uniques' : 'Uniques'}: ${pc(t.base)} a kill, +${pc(t.pity)} a miss. Next kill <b class="you">${pc(t.chance)}</b>.</p>` : '';
  return `<ul class="cx-loot">${sure}${gold}${own}</ul>${odds}`;
}

// ---------- the other pages ----------
function bossPage(s, e) {
  const fam = e.strain ? link(`strain:${e.strain}`, STRAINS[e.strain].name) : e.family ? link(`family:${e.family}`, famName(e.family)) : '<span class="tag dim">the server\'s family</span>';
  const head = `<header class="cx-head solo"><div class="cx-title"><h2>${e.raid ? 'Crew boss' : 'Boss'}</h2><h1>${esc(e.name)}</h1><p class="tagline">${fam}${e.floor ? `<span class="tag dim">Lv ${e.floor}+</span>` : ''}${e.lair ? `<span class="tag" title="Its lair">${esc(e.lair)}</span>` : ''}</p>
    <div class="stats">${stat('Your fights', e.fought, 'you')}${stat('Your wins', e.won, 'you')}${e.parts.length ? stat('Research', `${pctOf(e.parts)}%`, pctOf(e.parts) >= 100 ? 'full' : '', 'The average of its parts\' research. They share it with its family or strain') : ''}${stat('Integrity', `×${e.hp}`, '', 'Its Integrity, against a plain virus of its level')}${stat('Enrages', `cycle ${e.enrageAt}`, '', 'From this cycle every attack lands every cycle, a quarter harder')}</div>
    ${e.authors.length ? `<p class="cx-by"><span class="cx-label">Written by</span>${e.authors.map(byline).join('')}</p>` : ''}</div></header>`;
  const about = e.about ? `<p class="cx-rule">${esc(e.about)}</p>` : '';
  const sig = e.signature ? section('Signature', `<div class="cx-part"><div class="cxp-head"><b>${esc(e.signature.name)}</b></div><p class="cxp-does">${esc(e.signature.rule)}</p></div>`) : '';
  const phases = e.phases.length ? section('Phases', `<ol class="cx-phases">${e.phases.map((ph) => `<li><b class="cxph-at">${Math.round(ph.at * 100)}%</b><div>${ph.name ? `<b>${esc(ph.name)}</b>` : ''}${ph.say ? `<p>${esc(ph.say)}</p>` : ''}${ph.mechs ? `<p class="cxph-mechs">${ph.mechs.map((m) => `<span class="tag">${esc(m)}</span>`).join('')}</p>` : ''}</div></li>`).join('')}</ol>${e.enrage ? `<p class="cx-foot">Past its timer: ${esc(e.enrage)}.</p>` : ''}`) : '';
  const tells = e.raid ? '' : section('Tells', e.tells.length ? `<ul class="cx-tells">${e.tells.map(tellMarkup).join('')}</ul>` : '<p class="cx-foot">Brings no tells.</p>', ` <small>at <b class="you">Lv ${e.level}</b></small>`);
  const lv = e.parts[0]?.level || e.level, rides = (x) => e.tells.filter((t) => t.part === x.part.name).map((t) => ({ name: t.name, kind: t.kind }));
  const parts = e.parts.length ? section('Parts', `<div class="cx-parts">${e.parts.map((x) => partCard(lv, x, rides(x))).join('')}</div><p class="cx-foot">Its parts share their research with its ${e.strain ? 'strain' : 'family'}.</p>`, ` <small>at <b class="you">Lv ${lv}</b></small>`) : '';
  const loot = section('Loot', lootTable(e.loot));
  return head + about + sig + phases + parts + tells + loot;
}
function mutationPage(s, e) {
  const head = `<header class="cx-head solo"><div class="cx-title"><h2>Mutation</h2><h1>${esc(e.name)}</h1><p class="tagline"><span class="tag" style="--ax:${e.axis.colour}" title="${esc(`${e.axis.name}: it punishes ${e.axis.punishes}.`)}">${glyph(e.axis.icon)}${esc(e.axis.name)}</span><span class="tag dim">Lv ${e.opens}+</span></p>
    <div class="stats">${stat('Kills of it', `${e.kills}/2`, 'you', 'Two kills of a virus that carries it decode it')}</div></div></header>`;
  const rule = `<div class="cx-part"><div class="cxp-head"><b>${esc(e.name)}</b></div><p class="cxp-does">${esc(e.rule)}</p>${e.decoded ? `<p class="cxp-tele">${glyph('ids')}${esc(e.telegraph)}</p><p class="cxp-answer">${esc(e.answer)}</p>` : '<p class="cxp-hint">Beat two viruses that carry it to decode the answer.</p>'}</div>`;
  const on = section('Seen on', e.on.length ? `<p class="cx-chips">${e.on.map((n) => `<span class="tag">${esc(n)}</span>`).join('')}</p>` : '<p class="cx-foot">Any wild virus can roll it.</p>');
  return head + section('Rule', rule) + on;
}

function entryMarkup(s, key) {
  const e = entryOf(s, key);
  if (!e.known) {
    const g = { family: 'Family', strain: 'Strain', guard: 'Guard', runner: 'Exfil', boss: 'Boss', mutation: 'Mutation' }[e.group] || '';
    const how = e.group === 'boss' ? 'Fight it to fill this page.' : 'Meet one to fill this page.';
    return `<header class="cx-head solo"><div class="cx-title"><h2>${g}</h2><h1 class="unknown">${UNKNOWN}</h1><p class="cxp-hint">${how}</p></div></header>`;
  }
  if (e.group === 'boss') return bossPage(s, e);
  if (e.group === 'mutation') return mutationPage(s, e);
  return bodyPage(s, e);
}

// The page. sel: the entry picked (app.js codexSel), idx: the phone's index open.
export function codexPageMarkup(s, sel = null, idx = false) {
  const key = validKey(sel) ? sel : firstKey(s);
  const groups = entries(s), cur = groups.flatMap((g) => g.rows).find((r) => r.key === key);
  const html = `<div class="cx-page${idx ? ' idx-open' : ''}">
    <nav class="cx-index card" aria-label="Codex index"><button type="button" class="cx-fold" data-codex-fold aria-expanded="${idx}"><span class="cx-label">Index</span><b>${esc(cur?.name || UNKNOWN)}</b><span class="cx-caret" aria-hidden="true">${idx ? '▴' : '▾'}</span></button><div class="cx-groups">${indexMarkup(groups, key)}</div></nav>
    <article class="cx-entry card" aria-label="Codex entry" data-entry="${esc(key)}">${entryMarkup(s, key)}</article></div>`;
  return html;
}
export { entryOf as codexEntry };

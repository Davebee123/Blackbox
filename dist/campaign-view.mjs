// The campaign's pages (campaign.mjs): the map of servers by layer with the selected server's card beside it, and the
// Archive. docs/ui.md tokens and components, in the breach screen's style: amber is what you can click, teal is yours,
// gray is out of reach or outgrown.
import { esc, conClass } from './view.mjs';
import { hackerLevel, UNIQUES, bossUniques, bossChance, lairChance } from './combat.mjs';
import { lairUniques } from './network.mjs';
import { BOSSES, BOSS_LOOT } from './data.mjs';
import { AUTHORS } from './authors.mjs';
import { REWRITES, outputLine } from './rewrites.mjs';
import { CVES, MODS } from './drafts.mjs';
import { ACTS } from './breach.mjs';
import { residentAbout } from './breach-view.mjs';
import { SERVERS, SERVER, LAYERS, CAMPAIGN, statusOf, outgrown, outputsFor, bountiesOn, BOUNTIES, BOUNTY_PAY, bestOf, archiveOf, FRAGMENTS, held, heatOpen, heatFloor, canReplay, recOf } from './campaign.mjs';
import { HEAT, MAX_HEAT, heatList, heatPay } from './heat.mjs';

// What the page shows that the campaign doesn't keep: the server you're looking at, and the bounty you mean to take.
export const campUi = { sel: null, bounty: {}, heat: {} };
// The heat a card is set to (app.js keeps the pick in campUi.heat): the floor a re-image asks for, up to what's open.
export const heatOf = (s, id) => Math.max(heatFloor(s, id), Math.min(heatOpen(s), campUi.heat[id] ?? heatFloor(s, id)));
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// ---------- the map ----------
const G = { band: 150, head: 34, pad: 16 };
const xOf = (srv) => 12 + (srv.col * 76) / 3;
const yOf = (srv) => G.pad + (srv.layer - 1) * G.band + G.head + (G.band - G.head) / 2;
// The server you look at first: the one you were looking at, else the lowest you can breach and don't hold.
export function selected(s) {
  if (campUi.sel && SERVER[campUi.sel] && statusOf(s, campUi.sel) !== 'hidden') return campUi.sel;
  const open = SERVERS.filter((x) => statusOf(s, x.id) === 'open').sort((a, b) => a.level - b.level)[0];
  return (open || SERVER[CAMPAIGN.start]).id;
}
function nodeMarkup(s, srv, sel) {
  const st = statusOf(s, srv.id), rec = s.camp.servers?.[srv.id];
  const on = sel === srv.id ? ' sel' : '';
  if (st === 'fog') return `<button type="button" class="cp-node st-fog${on}" style="left:${xOf(srv)}%;top:${yOf(srv)}px" data-camp="sel" data-arg="${esc(srv.id)}" title="Unknown server: capture a server linked to it to see what it is."><span class="cp-chip"><span class="cp-q">?</span></span><span class="cp-name">unknown</span></button>`;
  const L = hackerLevel(s), old = outgrown(s, srv);
  const marks = [];
  if (st === 'held') marks.push(`<span class="cp-mark held" title="Held: its rewrites run on your breaches.">${Object.keys(rec?.rewrites || {}).length}/${srv.subsystems.flat().length}</span>`);
  if (st === 'held' && rec?.heat) marks.push(`<span class="cp-mark heat" title="${esc(`Captured at heat ${rec.heat}. A re-image asks for heat ${rec.heat} or more.`)}">H${rec.heat}</span>`);
  if (rec?.checkpoint && !rec.captured) marks.push(`<span class="cp-mark ck" title="Checkpoint: a retry can start past gate ${rec.checkpoint.gate}.">G${rec.checkpoint.gate}</span>`);
  return `<button type="button" class="cp-node st-${st}${old ? ' old' : ''}${on}" style="left:${xOf(srv)}%;top:${yOf(srv)}px" data-camp="sel" data-arg="${esc(srv.id)}" title="${esc(`${srv.name}: a level ${srv.level} ${srv.kind}. ${st === 'held' ? 'You hold it.' : 'You can breach it.'}`)}">`
    + `<span class="cp-chip"><span class="ico" ${icon(st === 'held' ? 'server' : 'pulse-node')}></span><b class="${old ? 'con-gray' : conClass(srv.level - L)}">${srv.level}</b>${marks.join('')}</span>`
    + `<span class="cp-name">${esc(srv.name)}</span><small>${esc(srv.kind)} · ${esc(srv.residentName || BOSSES[srv.resident]?.name || '')}</small></button>`;
}
function mapMarkup(s, sel) {
  const shown = SERVERS.filter((x) => statusOf(s, x.id) !== 'hidden');
  const ids = new Set(shown.map((x) => x.id));
  const layers = LAYERS.filter((l) => shown.some((x) => x.layer === l.n));
  const height = G.pad * 2 + Math.max(1, ...layers.map((l) => l.n)) * G.band;
  const seen = new Set();
  const edges = [];
  for (const a of shown) for (const id of a.links) {
    const k = [a.id, id].sort().join('|');
    if (!ids.has(id) || seen.has(k)) continue;
    seen.add(k);
    const b = SERVER[id], sa = statusOf(s, a.id), sb = statusOf(s, b.id);
    const cls = sa === 'held' && sb === 'held' ? 'held' : (sa === 'held' && sb === 'open') || (sb === 'held' && sa === 'open') ? 'live' : sa === 'fog' || sb === 'fog' ? 'fog' : 'seen';
    // Two servers on one layer with another between them: the link bows over the row, never through that server.
    const bow = a.layer === b.layer && SERVERS.some((x) => x.layer === a.layer && ids.has(x.id) && x.col > Math.min(a.col, b.col) && x.col < Math.max(a.col, b.col));
    edges.push(bow
      ? `<path class="cp-e ${cls}" d="M${xOf(a)} ${yOf(a) - 20} Q${(xOf(a) + xOf(b)) / 2} ${yOf(a) - 68} ${xOf(b)} ${yOf(b) - 20}" fill="none" vector-effect="non-scaling-stroke"/>`
      : `<line class="cp-e ${cls}" x1="${xOf(a)}" y1="${yOf(a)}" x2="${xOf(b)}" y2="${yOf(b)}" vector-effect="non-scaling-stroke"/>`);
  }
  const heads = layers.map((l) => `<div class="cp-layer" style="top:${G.pad + (l.n - 1) * G.band}px;height:${G.band}px"><span class="cp-layer-k">LAYER ${l.n}</span><b>${esc(l.name)}</b><span class="cp-layer-b">lv ${l.band[0]}–${l.band[1]}</span></div>`).join('');
  return `<div class="cp-board" style="height:${height}px">${heads}<svg class="cp-edges" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">${edges.join('')}</svg>${shown.map((x) => nodeMarkup(s, x, sel)).join('')}</div>`;
}

// ---------- the card ----------
const row = (label, body, tip = '') => `<div class="op-row"><span class="op-label"${tip ? ` title="${esc(tip)}"` : ''}>${label}</span><div class="op-val">${body}</div></div>`;
// A Resident's loot: its own uniques, or (a native boss) your network's natives open at its level.
function collection(s, srv) {
  const B = BOSSES[srv.resident], lvl = srv.level + 1;
  if (!B) return '';
  const ids = B.native ? lairUniques(s, 'you', lvl) : bossUniques(srv.resident).map((u) => u.id);
  if (!ids.length) return '<span class="dim">none at this level</span>';
  const got = s.collection || {}, have = ids.filter((id) => got[id]).length;
  const odds = Math.round((B.native ? lairChance(s, 'you') : bossChance(s, srv.resident)) * 100);
  const items = ids.map((id) => got[id] ? `<li class="on" title="${esc(UNIQUES[id]?.flavour || '')}"><b class="iname r-zeroday">${esc(UNIQUES[id].name)}</b></li>` : `<li><span class="coll-q" title="${esc(B.native ? 'A native of your network. It drops from the native Residents.' : `One of ${B.name}'s own.`)}">???</span></li>`).join('');
  return `<div class="cp-coll"><span class="cp-coll-n">${have}/${ids.length}</span><span class="coll-odds" title="${esc(`The chance a kill drops one. Each kill that drops none adds ${Math.round(BOSS_LOOT.pity * 100)}%.`)}">${odds}% a kill</span><ul>${items}</ul></div>`;
}
function runsLine(srv) {
  return srv.subsystems.map((pair, i) => `<span class="cp-act" title="${esc(`${ACTS[i].name}: act ${i + 1}${i ? `, level ${srv.level + i}` : ''}. Win a fight on a subsystem's row to rewrite it.`)}">/${ACTS[i].dir} <b>${pair.map(esc).join(', ')}</b></span>`).join('');
}
// The rewrites your network brings to a breach of this server (each once, at its best tier).
function reaching(s, id) {
  const out = outputsFor(s, id);
  const chips = Object.entries(out).map(([rw, tier]) => `<li class="bx-perk mod" title="${esc(`${REWRITES[rw].name}${tier > 1 ? ' II' : ''}: ${REWRITES[rw].output[tier - 1]}`)}">${esc(REWRITES[rw].name)}${tier > 1 ? ' II' : ''}</li>`).join('');
  return chips ? `<ul class="bx-perks cp-perks">${chips}</ul>` : '<span class="dim">none yet</span>';
}
function bountyList(s, srv) {
  const list = bountiesOn(s, srv.id);
  if (!list.length) return '';
  const pick = campUi.bounty[srv.id];
  const rows = list.map((k) => {
    const B = BOUNTIES[k], on = pick === k;
    return `<li class="${on ? 'on' : ''}"><button type="button" class="btn small" data-camp="bounty" data-arg="${esc(`${srv.id}:${k}`)}" aria-pressed="${on}" title="${esc(on ? 'Taken: it rides on your next breach of this server.' : 'Take it: one bounty a breach. Missing it costs nothing.')}">${on ? 'Taken' : 'Take'}</button><span class="cp-b-from">${esc(B.from)}</span><span class="cp-b-text">${esc(B.text)}</span><small>${esc(BOUNTY_PAY)}</small></li>`;
  }).join('');
  return `<h3 class="bx-sec">Bounties <small>${list.length}</small></h3><ul class="cp-bounties">${rows}</ul>`;
}
function cardMarkup(s, id) {
  const srv = SERVER[id], st = statusOf(s, id), layer = LAYERS.find((l) => l.n === srv.layer);
  if (st === 'fog') return `<section class="card cp-card fog"><h2>Layer ${layer.n} · ${esc(layer.name)}</h2><h1>Unknown</h1><div class="tagline"><span class="tag dim">lv ${layer.band[0]}–${layer.band[1]}</span></div><p class="dim" title="Capture a server linked to it and its card opens.">Linked to a server you can breach.</p></section>`;
  const rec = s.camp.servers?.[id], L = hackerLevel(s), B = BOSSES[srv.resident];
  const name = srv.residentName || B?.name;
  const tags = [`<b class="${outgrown(s, srv) ? 'con-gray' : conClass(srv.level - L)}">Level ${srv.level}</b>`, `<span class="tag">${esc(srv.kind)}</span>`, `<span class="tag" style="color:${AUTHORS[srv.author]?.colour};border-color:currentColor" title="${esc(AUTHORS[srv.author]?.style || '')}">${esc(AUTHORS[srv.author]?.name || srv.author)}</span>`];
  if (st === 'held') tags.push('<span class="tag you" title="Held: its rewrites run on your breaches. Breach it again to re-image it.">Held</span>');
  if (outgrown(s, srv)) tags.push(`<span class="tag dim" title="Outgrown: ${L - srv.level} levels under you. Its kills pay little XP.">Outgrown</span>`);
  if (rec?.checkpoint && !rec.captured) tags.push(`<span class="tag warn" title="Checkpoint: gate ${rec.checkpoint.gate} is down. A retry can start past it.">Checkpoint · gate ${rec.checkpoint.gate}</span>`);
  const acts = srv.subsystems.length;
  const shape = `${plural(acts, 'act')}${acts > 1 ? ` · ${plural(acts - 1, 'gate')}` : ''} · ${(srv.rows || 4)} rows`;
  const rows = [
    row('Resident', `<span title="${esc(residentAbout(srv.resident))}"><b>${esc(name)}</b> <small class="dim">lv ${srv.level + 1}</small></span>`),
    row('Loot', collection(s, srv), `${name}'s Collection: the uniques it can drop.`),
    row('Runs', `<div class="cp-runs">${runsLine(srv)}</div><small class="dim">${esc(shape)}</small>`),
    row('Best', esc(bestOf(s, id) || '—')),
  ];
  if (srv.unlock && !rec?.captured) rows.push(row('Opens', `<span class="bx-perk cve r-${{ common: 'stock', uncommon: 'tuned', rare: 'custom' }[CVES[srv.unlock].rarity]}" title="${esc(`${CVES[srv.unlock].name}: ${CVES[srv.unlock].text}`)}">${esc(CVES[srv.unlock].name)}</span>`, 'Its first capture adds this CVE to your draft pool.'));
  rows.push(row('With you', reaching(s, id), 'The rewrites your captured servers run on a breach of this one. Each counts once, at its best tier.'));
  const outs = st === 'held' ? `<h3 class="bx-sec">Output <small>${Object.keys(rec.rewrites).length}/${srv.subsystems.flat().length}</small></h3><ul class="cap-lines cp-out">${srv.subsystems.flat().map((sub) => { const o = outputLine(sub, rec.rewrites[sub]); return `<li class="${rec.rewrites[sub] ? '' : 'stock'}"><span class="cap-sub">${esc(sub)}</span><b>${esc(o.name)}</b><span>${esc(o.text)}</span></li>`; }).join('')}</ul>` : '';
  const can = st === 'open' || st === 'held';
  const ck = rec?.checkpoint && !rec.captured ? rec.checkpoint.gate : 0;
  const heat = heatOf(s, id);
  if (can && heatOpen(s) > 0) rows.push(row('Heat', heatPicker(s, id, heat), 'Heat: pick it for this breach. Each rank adds a modifier and pays for it.'));
  const go = !can ? '' : ck
    ? `<button type="button" class="btn primary" data-camp="breach" data-arg="${esc(id)}:checkpoint" title="${esc(`Retry past gate ${ck}: a fresh map from act ${ck + 1}, with the rewrites from the acts behind it. Drafts and Signal start fresh.`)}">Breach from gate ${ck}</button><button type="button" class="btn" data-camp="breach" data-arg="${esc(id)}:start">From the start</button>`
    : `<button type="button" class="btn primary" data-camp="breach" data-arg="${esc(id)}:start"${st === 'held' ? ` title="${esc('Re-image: breach it again. Each subsystem you clear keeps its rewrite or takes a new one, and the Resident is the same fight.')}"` : ''}>${st === 'held' ? 'Re-image' : 'Breach'}${heat ? ` · heat ${heat}` : ''}</button>`;
  const replay = st === 'held' && Object.values(rec.rewrites).some((x) => x.id === 'range') ? `<button type="button" class="btn" data-camp="breach" data-arg="${esc(id)}:replay"${canReplay(s, id) ? '' : ' disabled'} title="${esc(`Replay (Range): ${name} alone, for its loot. Each breach you win earns a replay.`)}">Replay<small>${s.camp.replays || 0} left</small></button>` : '';
  return `<section class="card cp-card${st === 'held' ? ' held' : ''}"><h2>Layer ${layer.n} · ${esc(layer.name)}</h2><h1>${esc(srv.name)}</h1><div class="tagline">${tags.join('')}</div>
    <div class="cp-rows">${rows.join('')}</div>${outs}${bountyList(s, srv)}${go ? `<div class="row acts">${go}${replay}</div>` : ''}</section>`;
}

// The heat picker on a card: − rank +, its modifiers as chips (each one's text on hover), and what it pays.
function heatPicker(s, id, heat) {
  const lo = heatFloor(s, id), hi = heatOpen(s);
  const chips = heatList(heat).map((x) => `<li class="cp-heat-mod" title="${esc(`Heat ${x.n}, ${x.name}: ${x.text}`)}"><b>${x.n}</b>${esc(x.name)}</li>`).join('');
  const next = heat < MAX_HEAT ? HEAT[heat + 1] : null;
  return `<div class="cp-heat"><div class="cp-heat-k"><button type="button" class="btn small" data-camp="heat" data-arg="${esc(id)}:-1"${heat <= lo ? ' disabled' : ''} aria-label="Less heat" title="${esc(lo ? `Captured at heat ${lo}: a re-image asks for ${lo} or more.` : 'Less heat.')}">−</button><b class="${heat ? 'hot' : ''}" title="${esc(heatPay(heat))}">${heat}</b><button type="button" class="btn small" data-camp="heat" data-arg="${esc(id)}:1"${heat >= hi ? ' disabled' : ''} aria-label="More heat" title="${esc(heat >= hi ? (hi >= MAX_HEAT ? 'Heat 8 is the top.' : `Capture any server at heat ${hi} to open heat ${hi + 1}.`) : `Heat ${heat + 1}, ${next?.name}: ${next?.text}`)}">+</button><small>of ${hi}</small></div>${chips ? `<ul class="cp-heat-mods">${chips}</ul>` : ''}</div>`;
}

// ---------- the strip ----------
function stripMarkup(s) {
  const c = s.camp, n = SERVERS.filter((x) => held(s, x.id)).length;
  const all = {};
  for (const x of SERVERS) for (const { id, tier } of Object.values(c.servers?.[x.id]?.captured ? c.servers[x.id].rewrites : {})) all[id] = Math.max(all[id] || 0, tier);
  const chips = Object.entries(all).map(([rw, tier]) => `<li class="bx-perk mod" title="${esc(`${REWRITES[rw].name}${tier > 1 ? ' II' : ''}: ${REWRITES[rw].output[tier - 1]}`)}">${esc(REWRITES[rw].name)}${tier > 1 ? ' II' : ''}</li>`).join('');
  const pool = c.pool.map((id) => CVES[id].name).join(', '), alts = (c.mods || []).map((id) => MODS[id].name).join(', ');
  return `<header class="bx-hud cp-strip" aria-label="Your network">
    <span class="bx-hud-id" title="Your network: the servers you hold, and what they run for you."><span class="ico" ${icon('server')}></span><b>NETWORK</b></span>
    <span class="bx-stat" title="Held: servers you've captured. Each one's rewrites run on your breaches."><span class="lbl">Held</span><b>${n}</b><small>/${SERVERS.length}</small></span>
    <span class="bx-stat" title="Breaches: every run, won or lost."><span class="lbl">Breaches</span><b>${c.breaches}</b></span>
    <span class="bx-stat" title="${esc(`CVE pool: what a draft can offer. ${pool}.`)}"><span class="lbl">CVEs</span><b>${c.pool.length}</b><small>/${Object.keys(CVES).length}</small></span>
    <span class="bx-stat" title="${esc(`Mod pool: a mod for every skill on your bar, and the second mods heat opens${alts ? `: ${alts}` : ''}.`)}"><span class="lbl">Mods</span><b>${Object.values(MODS).filter((m) => !m.alt).length + (c.mods || []).length}</b><small>/${Object.keys(MODS).length}</small></span>
    <span class="bx-stat" title="${esc(`Heat: the highest rank you can breach at. Capture any server at heat ${heatOpen(s)} to open the next.${(c.heatCleared || []).length ? ` Cleared: ${c.heatCleared.sort((a, b) => a - b).join(', ')}.` : ''}`)}"><span class="lbl">Heat</span><b class="${heatOpen(s) ? 'hot' : ''}">${heatOpen(s)}</b><small>/${MAX_HEAT}</small></span>
    <span class="bx-stat" title="Archive: core.dump fragments recovered from Residents."><span class="lbl">Archive</span><b>${c.archive.length}</b><small>/${FRAGMENTS.length}</small></span>
    ${chips ? `<ul class="bx-perks" aria-label="Outputs">${chips}</ul>` : ''}
  </header>`;
}

export function campaignMarkup(s) {
  if (!s.camp) return '<section class="card"><h2>Campaign</h2><h1>No campaign</h1></section>';
  const sel = selected(s);
  return `<div class="cp">
    ${stripMarkup(s)}
    <section class="panel cp-map" data-pane="net · ${esc(s.profile?.handle || 'you')}"><div class="cp-scroll">${mapMarkup(s, sel)}</div></section>
    <aside class="cp-side">${cardMarkup(s, sel)}</aside>
  </div>`;
}

// ---------- the Archive ----------
export function archiveMarkup(s) {
  const a = archiveOf(s);
  const threads = a.threads.map((t) => `<li class="${t.have ? 'on' : ''}" title="${esc(`${t.thread}: ${t.have} of ${t.of} found.`)}"><b>${esc(t.thread)}</b><span>${t.have}/${t.of}</span></li>`).join('');
  const frags = a.found.map((f) => `<li class="cap-dump"><div class="cap-dump-k"><span class="ar-n">#${f.order}</span><b>${esc(f.title)}</b><span>${esc(f.from)}</span><span class="cap-frag">${esc(f.thread)} ${f.n}/${f.of} · ${esc(SERVER[f.server].name)}</span></div><pre>${f.lines.map(esc).join('\n')}</pre></li>`).join('');
  return `<div class="page-grid ar"><section class="card ar-card"><h2>Archive · ${a.found.length}/${FRAGMENTS.length}</h2><h1>core.dump</h1>
    <ul class="ar-threads">${threads}</ul>
    ${frags ? `<ol class="ar-list">${frags}</ol>` : ''}
    ${a.missing ? `<p class="ar-missing" title="Each Resident leaves one in /core the first time it falls.">${a.missing} still out there</p>` : ''}</section></div>`;
}

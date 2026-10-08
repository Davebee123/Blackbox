// The breach page (breach.mjs): the branching map as a drawing, the screen a node opens (a draft, a rewrite, a cache,
// a stall, a terminal, a gate), and the run's state. docs/ui.md tokens and components; the map is the centre.
import { esc } from './view.mjs';
import { ABILITIES, GUARDS, FAMILIES, STRAINS } from './data.mjs';
import { RARITIES, itemLabel, statLine } from './gear.mjs';
import { stashItem, effectLine, equippedSkills, knownSkills, classOf } from './combat.mjs';
import { AUTHORS } from './authors.mjs';
import { SERVER_CARD, ACTS, BREACH, EVENTS, BROKERS, nodeList, reachable, visible, currentNode, rowSub, signalOf, maxOf, captureOf, fogOf, eventText } from './breach.mjs';
import { MODS, CVES, cardText, DRAFT } from './drafts.mjs';
import { SUBSYSTEMS, REWRITES, outputLine } from './rewrites.mjs';

const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const KIND = {
  virus: { label: 'virus', icon: 'pulse-node', word: 'A wild virus. Beat it for a draft, then rewrite its subsystem.' },
  elite: { label: 'elite', icon: 'mutation', word: 'A bigger virus with two tells. Its draft has a CVE for sure, and its rewrite is tier II.' },
  cache: { label: 'cache', icon: 'loot', word: 'Tokens and a protocol. One cache in four is bait, so read it before you pull it.' },
  defrag: { label: 'defrag', icon: 'shell-shield', word: 'A quiet sector. Rest for 30% Signal, or re-slot your keys.' },
  broker: { label: 'broker', icon: 'exploit', word: "A broker's stall. Spend tokens on mods, CVEs, gear or a Signal patch." },
  term: { label: 'term', icon: 'command', word: 'A terminal with a file on it, and a choice with a cost.' },
  gate: { label: 'gate', icon: 'event-lock', word: 'A guard. Beat it and your pack banks.' },
  boss: { label: 'core', icon: 'server', word: 'The Resident.' },
};
// Geometry: a gutter for the subsystem names, then four lanes. y in px, x in % of the board.
const G = { gut: 21, row: 78, head: 46, gate: 84, pad: 34 };
const laneX = (col) => G.gut + ((col + 0.5) * (100 - G.gut - 2)) / BREACH.cols;

function layout(map) {
  const ys = {}, heads = [];
  let y = G.pad;
  for (let act = 0; act < ACTS.length; act++) {
    heads.push({ act, y });
    y += G.head;
    for (let row = 0; row < BREACH.rows; row++) { ys[`${act}:${row}`] = y + G.row / 2; y += G.row; }
    ys[`${act}:${BREACH.rows}`] = y + G.gate / 2; y += G.gate;
  }
  const pos = {};
  for (const n of nodeList(map)) pos[n.id] = { x: n.col == null ? 50 + G.gut / 2 : laneX(n.col), y: ys[`${n.act}:${n.row}`] };
  return { pos, heads, ys, height: y + G.pad };
}

// What a node says on hover, as much as you can read of it.
function nodeTip(s, n) {
  const b = s.breach, seen = visible(s, n);
  if (!seen) return `Out of sight. You read ${fogOf(s)} rows ahead.`;
  if (n.kind === 'gate') return `${GUARDS[n.guard].name}, level ${n.level}. ${GUARDS[n.guard].summary} Beat it and your pack banks.`;
  if (n.kind === 'boss') return `DEADBOLT, level ${n.level}. A Mutex locks its Encryptor. At 60% Integrity it re-arms every part, and at 30% a second Mutex throws a fresh lock.`;
  const where = n.sub ? `This row runs ${n.sub}, ${SUBSYSTEMS[n.sub].about}. ` : '';
  if (n.kind === 'virus' || n.kind === 'elite') {
    const fam = n.strain ? STRAINS[n.strain].name : FAMILIES[n.family]?.name;
    return `${where}${n.kind === 'elite' ? 'An elite' : 'A'} level ${n.level} ${fam} virus, written by ${AUTHORS[n.author]?.name || '?'}. ${n.kind === 'elite' ? 'Its draft has a CVE for sure, and its rewrite is tier II.' : 'Beat it for a draft, then the rewrite.'}${b.cleared[n.id] ? ' You cleared it.' : ''}`;
  }
  if (n.kind === 'broker') return `${BROKERS[n.faction].name} sells ${BROKERS[n.faction].sells.toLowerCase()} here.`;
  return where + KIND[n.kind].word;
}

function mapMarkup(s) {
  const b = s.breach, map = b.map, { pos, heads, height } = layout(map);
  const here = currentNode(s), reach = new Set(reachable(s).map((n) => n.id));
  const onPath = new Set(b.path.slice(1).map((id, i) => `${b.path[i]}>${id}`));
  // Edges first, under the nodes.
  const edges = map.edges.map(([a, c]) => {
    const p = pos[a], q = pos[c], na = map.nodes[a], nc = map.nodes[c];
    if (!p || !q) return '';
    const walked = onPath.has(`${a}>${c}`), live = (here ? here.id === a : !na) && reach.has(c), seen = visible(s, na) && visible(s, nc);
    const cls = walked ? 'walked' : live ? 'live' : seen ? 'seen' : 'fog';
    // Gates and the core are bars: edges meet them at the lane's x.
    const qx = nc.col == null ? p.x : q.x, px = na.col == null ? q.x : p.x;
    const y1 = p.y + (na.col == null ? 14 : 20), y2 = q.y - (nc.col == null ? 14 : 20);
    return `<line class="bx-e ${cls}" x1="${px}" y1="${y1}" x2="${qx}" y2="${y2}" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  const headMarks = heads.map(({ act, y }) => {
    const [a, c] = SERVER_CARD.subsystems[act], lvl = b.level + BREACH.actLevel[act];
    const done = here && (here.act > act || (here.act === act && here.kind === 'gate' && b.cleared[here.id]));
    return `<div class="bx-act${here?.act === act || (!here && act === 0) ? ' on' : ''}${done ? ' done' : ''}" style="top:${y}px"><span class="bx-act-n">ACT ${act + 1}</span><b>${esc(ACTS[act].name)}</b><span class="bx-act-sub">/${esc(ACTS[act].dir)} · ${esc(a)}, ${esc(c)} · lv ${lvl}</span></div>`;
  }).join('');
  // The gutter: each row's subsystem, and its rewrite once you have one.
  const gut = [];
  for (let act = 0; act < ACTS.length; act++) for (let row = 0; row < BREACH.rows; row++) {
    const any = nodeList(map).find((n) => n.act === act && n.row === row);
    if (!any) continue;
    const sub = rowSub(act, row), held = sub && b.rewrites[sub];
    const fogged = !visible(s, any);
    gut.push(`<div class="bx-gut${held ? ' held' : ''}${fogged ? ' fog' : ''}" style="top:${pos[any.id].y}px" title="${esc(sub ? `${sub}: ${SUBSYSTEMS[sub].about}.${held ? ` Rewritten: ${REWRITES[held.id].name}${held.tier > 1 ? ' II' : ''}.` : ' Not rewritten yet.'}` : 'A rest row: defrag or a broker before the gate.')}"><span class="bx-gut-dir">${esc(sub ? sub + '/' : 'tmp/')}</span>${held ? `<small>${esc(REWRITES[held.id].name)}${held.tier > 1 ? ' II' : ''}</small>` : sub ? '<small>stock</small>' : '<small>rest</small>'}</div>`);
  }
  const nodes = nodeList(map).map((n) => {
    const p = pos[n.id], seen = visible(s, n), cleared = !!b.cleared[n.id], isHere = here?.id === n.id, can = reach.has(n.id);
    const k = KIND[n.kind] || KIND.virus;
    const state = isHere ? 'here' : cleared ? 'cleared' : can ? 'reach' : seen ? 'seen' : 'fog';
    const attrs = can ? `data-breach="go" data-arg="${esc(n.id)}"` : 'disabled';
    const tip = esc(nodeTip(s, n));
    if (n.kind === 'gate' || n.kind === 'boss') {
      const name = n.kind === 'gate' ? GUARDS[n.guard].name.toUpperCase() : 'DEADBOLT';
      const note = n.kind === 'gate' ? 'banks your pack' : 'the Resident · /core';
      return `<button type="button" class="bx-bar k-${n.kind} s-${state}" style="top:${p.y}px" ${attrs} title="${tip}"><span class="ico" ${icon(k.icon)}></span><span class="bx-bar-k">${n.kind === 'gate' ? 'GATE' : 'RESIDENT'}</span><b>${esc(name)}</b><small>lv ${n.level} · ${esc(note)}</small>${isHere ? '<span class="bx-you">you</span>' : ''}${cleared ? '<span class="bx-done">down</span>' : ''}</button>`;
    }
    const label = seen ? k.label : '?';
    const sub = seen && (n.kind === 'virus' || n.kind === 'elite') ? (n.strain ? STRAINS[n.strain].name.toLowerCase() : AUTHORS[n.author]?.name.toLowerCase()) : seen && n.kind === 'broker' ? BROKERS[n.faction].name.toLowerCase() : seen && n.kind === 'term' ? EVENTS[n.event].file.split('/').pop() : '';
    return `<button type="button" class="bx-node k-${seen ? n.kind : 'fog'} s-${state}" style="left:${p.x}%;top:${p.y}px" ${attrs} title="${tip}" aria-label="${esc(seen ? `${k.label} ${n.sub || ''}` : 'unknown node')}">`
      + `<span class="bx-chip">${seen ? `<span class="ico" ${icon(k.icon)}></span>` : '<span class="bx-q">?</span>'}</span>`
      + `${seen ? `<span class="bx-lbl">${esc(label)}</span>` : ''}${sub ? `<small class="bx-sub">${esc(sub)}</small>` : ''}${isHere ? '<span class="bx-you">you</span>' : ''}</button>`;
  }).join('');
  const start = !b.at && !b.result ? `<div class="bx-start" style="top:${G.pad / 2}px">▸ jack in: pick a lit node</div>` : '';
  return `<div class="bx-board" style="height:${height}px">${headMarks}${gut.join('')}<svg class="bx-edges" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${nodes}${start}</div>`;
}

// ---------- the screens ----------
const btn = (verb, label, { arg = null, primary = false, hot = false, disabled = false, note = '' } = {}) => `<button type="button" class="btn${primary ? ' primary' : ''}${hot ? ' hot-btn' : ''}" data-breach="${verb}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}>${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</button>`;
function cardTile(s, c, i, verb, extra = '') {
  const t = cardText(c), b = s.breach;
  if (c.kind === 'gear') {
    const it = c.item, rule = it.rule ? effectLine(it) : '';
    return `<li class="bx-card k-gear r-${it.rarity}"><span class="bx-card-k">Gear · ${esc(RARITIES[it.rarity].name)}</span><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><p>${esc(statLine(it.stats))}</p>${rule ? `<p class="bx-rule">${esc(rule)}</p>` : ''}${extra}<div class="bx-card-act">${btn(verb, 'Take', { arg: i })}</div></li>`;
  }
  const replaces = c.kind === 'mod' && b.mods.find((id) => MODS[id].skill === MODS[c.id].skill && id !== c.id);
  return `<li class="bx-card k-${c.kind} r-${c.rarity}"><span class="bx-card-k">${esc(t.kicker)}</span><b>${esc(t.name)}</b><p>${esc(t.text)}</p>${replaces ? `<p class="bx-rule">Replaces ${esc(MODS[replaces].name)}.</p>` : ''}${extra}<div class="bx-card-act">${btn(verb, 'Take', { arg: i })}</div></li>`;
}
function screenMarkup(s) {
  const b = s.breach, sc = b.screen;
  if (!sc) {
    const xs = reachable(s);
    return `<section class="card bx-screen bx-idle"><h2>${b.at ? 'Next' : 'Jack in'}</h2><h1>${b.at ? 'Pick your next node' : 'Pick a first node'}</h1><p class="svc-line">${xs.length ? `${xs.length} ${xs.length === 1 ? 'node is' : 'nodes are'} in reach, lit on the map. You read ${fogOf(s)} rows ahead.` : 'Nothing is in reach.'}</p></section>`;
  }
  if (sc.kind === 'draft') {
    const can = b.rerolls > 0;
    return `<section class="card bx-screen"><h2>${esc(sc.title)} · pick 1 of ${sc.cards.length}</h2><ul class="bx-cards">${sc.cards.map((c, i) => cardTile(s, c, i, 'pick')).join('')}</ul><div class="row acts">${sc.noSkip ? '' : btn('skip', 'Skip', { note: `+${DRAFT.skip} tokens` })}${btn('reroll', 'Reroll', { disabled: !can, note: `${b.rerolls} left` })}</div></section>`;
  }
  if (sc.kind === 'rewrite') {
    const tiles = sc.options.map((id, i) => { const r = REWRITES[id]; return `<li class="bx-card k-rewrite"><span class="bx-card-k">Rewrite${sc.tier > 1 ? ' · tier II' : ''}</span><b>${esc(r.name)}${sc.tier > 1 ? ' II' : ''}</b><p><span class="bx-now">Now</span> ${esc(r.now)}</p><p class="bx-out"><span>Output</span> ${esc(r.output[sc.tier - 1])}</p><div class="bx-card-act">${btn('pick', 'Rewrite', { arg: i })}</div></li>`; }).join('');
    return `<section class="card bx-screen"><h2>${esc(sc.sub)} · ${esc(SUBSYSTEMS[sc.sub].about)} · pick 1</h2><h1>Rewrite ${esc(sc.sub)}</h1><p class="svc-line">Now applies for the rest of this breach. Output is what the server does for you once it is captured.</p><ul class="bx-cards two">${tiles}</ul></section>`;
  }
  if (sc.kind === 'cache') {
    const n = b.map.nodes[sc.node];
    return `<section class="card bx-screen"><h2>${esc(n.path)} · cache</h2>${term([`$ ls -l ${n.path}`, '-rw-------  1 ops ops  48k  cache.dat', ...(sc.read ? [`$ cat cache.dat`, n.bait ? 'CANARY CANARY CANARY CANARY (every block)' : `tokens: ${n.tokens} · protocol.bin`] : [])])}<div class="row acts">${btn('cat', 'cat cache.dat', { disabled: sc.read })}${btn('pull', 'pull', { hot: true, note: sc.read && n.bait ? 'bait' : '' })}${btn('leave', 'leave')}</div></section>`;
  }
  if (sc.kind === 'defrag') {
    const n = b.map.nodes[sc.node], heal = Math.min(maxOf(s) - signalOf(s), Math.round(b.max * BREACH.rest));
    if (sc.reslot) {
      const bar = equippedSkills(s, classOf(s)), spare = knownSkills(s, classOf(s)).filter((id) => !bar.includes(id));
      const row = (id, on) => `<li class="bx-slot${on ? ' on' : ''}"><b>${esc(ABILITIES[id]?.name || id)}</b>${b.mods.find((m) => MODS[m].skill === id) ? `<small class="bx-modtag">${esc(MODS[b.mods.find((m) => MODS[m].skill === id)].name)}</small>` : ''}${btn('slot', on ? 'Unequip' : 'Equip', { arg: `${on ? 'unequip' : 'equip'} ${id}` })}</li>`;
      return `<section class="card bx-screen"><h2>${esc(n.path)} · re-slot</h2><h1>Your keys</h1><ul class="bx-slots">${bar.map((id) => row(id, true)).join('')}${spare.map((id) => row(id, false)).join('')}</ul>${spare.length ? '' : '<p class="svc-line">Every skill you know is on your bar.</p>'}<div class="row acts">${btn('done', 'Done', { primary: true })}</div></section>`;
    }
    return `<section class="card bx-screen"><h2>${esc(n.path)} · defrag</h2><h1>Defrag</h1><p class="svc-line">Pick one. Your bar changes only here.</p><div class="row acts">${btn('rest', 'Rest', { primary: true, note: `+${heal} Signal` })}${btn('reslot', 'Re-slot', { note: 'change your keys' })}</div></section>`;
  }
  if (sc.kind === 'broker') {
    const B = BROKERS[sc.faction], price = (x) => Math.round(x * (sc.half ? 0.5 : 1));
    const tiles = sc.stock.map((c, i) => cardTile(s, c, i, 'buy', `<span class="bx-price${b.tokens < price(c.price) ? ' short' : ''}">${c.sold ? 'sold' : `${price(c.price)} tokens`}</span>`).replace('>Take<', c.sold ? ' disabled>Sold<' : '>Buy<')).join('');
    return `<section class="card bx-screen"><h2>${esc(b.map.nodes[sc.node].path)} · broker${sc.half ? ' · half price' : ''}</h2><h1>${esc(B.name)}</h1><p class="svc-line">${esc(B.sells)}. You hold ${b.tokens} tokens.</p><ul class="bx-cards">${tiles}</ul><div class="row acts">${btn('patch', 'Patch Signal', { disabled: sc.patched, note: `+25% · ${price(B.patch)} tokens` })}${btn('leave', 'Leave', { primary: true })}</div></section>`;
  }
  if (sc.kind === 'term') {
    const ev = EVENTS[sc.event];
    return `<section class="card bx-screen"><h2>${esc(b.map.nodes[sc.node].path)} · terminal</h2><h1>${esc(ev.name)}</h1>${term([`$ cat ${ev.file}`, ...ev.lines])}<ul class="bx-opts">${ev.options.map((o, i) => `<li>${btn('choose', o.label, { arg: i, hot: /Costs/.test(o.text) })}<span>${esc(eventText(b.map.nodes[sc.node], o.text))}</span></li>`).join('')}</ul></section>`;
  }
  if (sc.kind === 'gate') {
    const n = b.map.nodes[sc.node];
    return `<section class="card bx-screen"><h2>${esc(n.path)} · gate</h2><h1>${esc(GUARDS[n.guard].name)} down</h1><p class="svc-line">Your pack banks as you pass. Go deeper, or jack out with what you have and leave ${esc(SERVER_CARD.name)} uncaptured.</p><div class="row acts">${btn('goon', 'Go on', { primary: true, note: `act ${n.act + 2}` })}${btn('jackout', 'Jack out', { hot: true })}</div></section>`;
  }
  return '';
}
const term = (lines) => `<pre class="bx-term">${lines.map((l) => (l.startsWith('$') ? `<span class="you">${esc(l)}</span>` : esc(l))).join('\n')}</pre>`;

// ---------- the end ----------
function resultMarkup(s) {
  const b = s.breach;
  const again = `<div class="row acts"><button type="button" class="btn primary" data-breach="again">New breach</button><button type="button" class="btn" data-module="loadout">Loadout</button></div>`;
  if (b.result === 'won') {
    const c = captureOf(s);
    const lines = c.rewrites.map(({ sub, held }) => { const o = outputLine(sub, held); return `<li class="${held ? '' : 'stock'}"><span class="cap-sub">${esc(sub)}</span><b>${esc(o.name)}</b><span>${esc(o.text)}</span></li>`; }).join('');
    const loot = c.items.map((it) => `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b></li>`).join('');
    return `<section class="card bx-capture"><div class="cap-kick"><span>CAPTURED</span><span>heat 0</span></div><h1>${esc(SERVER_CARD.name)}</h1><p class="svc-line">${esc(SERVER_CARD.kind)} · ${esc(SERVER_CARD.author.toUpperCase())} · ${c.kills} fights · Resident DEADBOLT down</p>
      <ul class="cap-lines">${lines}</ul>
      <div class="cap-stats"><div class="stat"><span>XP</span><b>+${c.xp.toLocaleString('en-US')}</b></div><div class="stat"><span>Loot banked</span><b>${c.items.length}</b></div><div class="stat"><span>Mods · CVEs</span><b>${b.mods.length} · ${b.cves.length}</b></div></div>
      ${loot ? `<ul class="cap-loot">${loot}</ul>` : ''}
      <div class="cap-dump"><div class="cap-dump-k"><b>${esc(c.dump.title)}</b><span>${esc(c.dump.from)}</span><span class="cap-frag">${esc(c.dump.thread)} ${c.dump.n}/${c.dump.of}</span></div><pre>${c.dump.lines.map(esc).join('\n')}</pre></div>
      ${again}</section>`;
  }
  if (b.result === 'lost') {
    const L = b.lost || { items: [], mods: [], cves: [] };
    return `<section class="card bx-capture lost"><div class="cap-kick"><span>SIGNAL LOST</span><span>${esc(SERVER_CARD.name)}</span></div><h1>Disconnected</h1><p class="svc-line">${esc(L.why || '')}</p>
      <ul class="cap-lines"><li><span class="cap-sub">lost</span><b>${L.items.length} unbanked</b><span>${esc(L.items.join(', ') || 'nothing in the pack')}</span></li><li><span class="cap-sub">lost</span><b>drafts</b><span>${esc([...L.mods.map((m) => MODS[m].name), ...L.cves.map((c) => CVES[c].name)].join(', ') || 'none')}</span></li><li><span class="cap-sub">kept</span><b>+${b.xp.toLocaleString('en-US')} XP</b><span>${b.banked.length} banked ${b.banked.length === 1 ? 'item' : 'items'}. The server stays uncaptured.</span></li></ul>${again}</section>`;
  }
  return `<section class="card bx-capture"><div class="cap-kick"><span>JACKED OUT</span><span>${esc(SERVER_CARD.name)}</span></div><h1>Out with the pack</h1><p class="svc-line">${b.banked.length} ${b.banked.length === 1 ? 'item' : 'items'} banked, +${b.xp.toLocaleString('en-US')} XP. The server stays uncaptured.</p>${again}</section>`;
}

// ---------- the run ----------
function runMarkup(s) {
  const b = s.breach, sig = signalOf(s), max = maxOf(s), pct = max ? (sig / max) * 100 : 0;
  const lvl = pct <= 30 ? 'low' : pct <= 60 ? 'mid' : 'ok';
  const pack = b.pack.map((id) => stashItem(s, id)).filter(Boolean);
  const banked = b.banked.map((id) => stashItem(s, id)).filter(Boolean);
  const itemRow = (it, can) => `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><small>${esc(statLine(it.stats))}</small>${can ? btn('equip', 'Equip', { arg: it.id }) : ''}</li>`;
  const rigged = new Set(Object.values(s.gear?.rigs || {}).flat());
  const mods = b.mods.map((id) => `<li title="${esc(MODS[id].text)}"><b>${esc(MODS[id].name)}</b><small>${esc(ABILITIES[MODS[id].skill]?.name || '')}</small></li>`).join('');
  const cves = b.cves.map((id) => `<li class="r-${{ common: 'stock', uncommon: 'tuned', rare: 'custom' }[CVES[id].rarity]}" title="${esc(CVES[id].text)}"><b>${esc(CVES[id].name)}</b><small>${esc(CVES[id].rarity)}</small></li>`).join('');
  const subs = Object.keys(SUBSYSTEMS).map((sub) => { const h = b.rewrites[sub]; return `<li class="${h ? 'held' : ''}"><span>${esc(sub)}</span><b>${h ? esc(REWRITES[h.id].name + (h.tier > 1 ? ' II' : '')) : 'stock'}</b></li>`; }).join('');
  return `<section class="card bx-run"><h2>Breach · ${esc(SERVER_CARD.name)}</h2>
    <div class="bx-sig ${lvl}" title="Signal: your health for the whole breach. It carries from fight to fight. Defrag and a broker's patch restore it."><span class="lbl">Signal</span><span class="sigbar"><span style="width:${pct.toFixed(1)}%"></span></span><strong>${sig}</strong><small>/${max}</small></div>
    <div class="bx-tok"><span><span class="lbl">Tokens</span><b>${b.tokens}</b></span><span><span class="lbl">Rerolls</span><b>${b.rerolls}</b></span><span><span class="lbl">XP</span><b>+${b.xp}</b></span></div>
    <h3>Mods <small>${b.mods.length}</small></h3>${mods ? `<ul class="bx-list">${mods}</ul>` : '<p class="quiet">none yet</p>'}
    <h3>CVEs <small>${b.cves.length}</small></h3>${cves ? `<ul class="bx-list">${cves}</ul>` : '<p class="quiet">none yet</p>'}
    <h3>Pack <small>unbanked · ${pack.length}</small></h3>${pack.length ? `<ul class="bx-items">${pack.map((it) => itemRow(it, !rigged.has(it.id) && !b.result)).join('')}</ul>` : '<p class="quiet">empty</p>'}
    ${banked.length ? `<h3>Banked <small>${banked.length}</small></h3><ul class="bx-items">${banked.map((it) => itemRow(it, !rigged.has(it.id) && !b.result)).join('')}</ul>` : ''}
    <h3>Rewrites</h3><ul class="bx-subs">${subs}</ul>
  </section>`;
}
function logMarkup(s) {
  const lines = s.breach.log.slice(-9);
  return `<section class="card bx-log"><h2>tty · ${esc(SERVER_CARD.id)}</h2><pre>${lines.map((l) => (l.startsWith('cd ') ? `<span class="you">$ ${esc(l)}</span>` : esc(l))).join('\n')}</pre></section>`;
}

export function breachMarkup(s) {
  const b = s.breach;
  if (!b) return '<section class="card"><h2>Breach</h2><h1>No breach running</h1></section>';
  const head = `<header class="bx-head"><div class="bx-title"><span class="bx-kick">${esc(SERVER_CARD.kind)} · ${esc(SERVER_CARD.author.toUpperCase())}</span><b>${esc(SERVER_CARD.name)}</b><span class="bx-meta">level ${b.level} · Resident DEADBOLT · reads ${fogOf(s)} rows ahead</span></div>
    <ul class="bx-legend" aria-label="Legend">${['virus', 'elite', 'cache', 'defrag', 'broker', 'term'].map((k) => `<li title="${esc(KIND[k].word)}"><span class="ico" ${icon(KIND[k].icon)}></span>${KIND[k].label}</li>`).join('')}</ul></header>`;
  return `<div class="bx${b.result ? ' over' : ''}">
    <section class="panel bx-map" data-pane="tree ${esc(SERVER_CARD.id)}">${head}<div class="bx-scroll" id="bx-scroll">${mapMarkup(s)}</div></section>
    <aside class="bx-side">${b.result ? resultMarkup(s) : screenMarkup(s)}${runMarkup(s)}${logMarkup(s)}</aside>
  </div>`;
}
// Where the map should scroll to: the row you're on.
export function breachFocusY(s) {
  const b = s.breach;
  if (!b) return 0;
  const { pos } = layout(b.map), n = currentNode(s);
  return n ? pos[n.id].y : 0;
}

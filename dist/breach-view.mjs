// The breach page (breach.mjs): a slim strip of run state across the top, the branching map as a drawing, and beside
// it the one decision in front of you (a draft, a rewrite, a cache, a stall, a terminal, a gate), with a short tty
// under it. docs/ui.md tokens and components; the map is the centre, the decision is the focus.
import { esc } from './view.mjs';
import { ABILITIES, GUARDS, FAMILIES, STRAINS, BOSSES } from './data.mjs';
import { RARITIES, itemLabel, statLine } from './gear.mjs';
import { stashItem, effectLine, equippedSkills, knownSkills, classOf } from './combat.mjs';
import { AUTHORS } from './authors.mjs';
import { ACTS, BREACH, EVENTS, BROKERS, nodeList, reachable, visible, currentNode, rowSub, signalOf, maxOf, captureOf, fogOf, eventText, cardOf, residentName, priceOf, nextOf, restShare, recompilable } from './breach.mjs';
import { MODS, CVES, cardText, DRAFT, TAGS, buildTags, linksOf, modName, modText } from './drafts.mjs';
import { SUBSYSTEMS, REWRITES, outputLine } from './rewrites.mjs';
import { chipOf } from './genome.mjs';
import { geneChip } from './view.mjs';
import { HEAT, heatList, heatPay } from './heat.mjs';

// What the page shows that the breach doesn't keep: the pack's pop-over, the tty opened up, and the gear you've seen
// in the pack (new gear marks the Pack button until you open it).
export const bxUi = { pack: false, log: false, seen: new Set() };
export function bxToggle(what, s) {
  if (what === 'pack') { bxUi.pack = !bxUi.pack; if (bxUi.pack && s?.breach) for (const id of s.breach.pack) bxUi.seen.add(id); }
  if (what === 'log') bxUi.log = !bxUi.log;
}

// What a Resident does, from its boss entry (data.mjs BOSSES: its about, or its phases' lines).
export function residentAbout(boss) {
  const B = BOSSES[boss];
  if (!B) return '';
  return B.about || B.phases.map((p) => p.say).join(' ');
}
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const KIND = {
  virus: { label: 'virus', icon: 'pulse-node', word: 'A wild virus. Beat it for a draft, then rewrite its subsystem.' },
  elite: { label: 'elite', icon: 'mutation', word: 'A bigger virus with two tells. Its draft has a CVE for sure, and its rewrite is tier II.' },
  cache: { label: 'cache', icon: 'loot', word: 'Tokens, and now and then a protocol. One cache in four is bait, so read it before you pull it.' },
  defrag: { label: 'defrag', icon: 'shell-shield', word: 'A quiet sector. Rest for 30% Signal, or re-slot your keys.' },
  broker: { label: 'broker', icon: 'exploit', word: "A broker's stall. Spend tokens on mods, CVEs, gear or a Signal patch." },
  term: { label: 'term', icon: 'command', word: 'A terminal with a file on it, and a choice with a cost.' },
  gate: { label: 'gate', icon: 'event-lock', word: 'A guard. Beat it and your pack banks.' },
  boss: { label: 'core', icon: 'server', word: 'The Resident.' },
};
// What a fight's draft promises, on its node and its card (breach.mjs n.reward): mods teal, CVEs violet, gear amber,
// and a yellow star for a rare card.
export const REWARD = {
  mod: { word: 'mod', tip: 'Its draft offers mods: each changes how one skill on your bar works.' },
  cve: { word: 'cve', tip: 'Its draft offers CVEs: each lasts the breach.' },
  gear: { word: 'gear', tip: 'Its draft offers gear: real items that go in your pack.' },
};
const rewardTip = (n) => `${REWARD[n.reward].tip}${n.rare ? ' One of them is rare, for sure.' : ''}`;
const rewardPill = (n, cls = 'bx-rw') => (n.reward ? `<span class="${cls} rw-${n.reward}${n.rare ? ' rare' : ''}" title="${esc(rewardTip(n))}">${n.rare ? '★' : ''}${REWARD[n.reward].word}</span>` : '');
// A node's genome as gene chips (genome.mjs chipOf): ??? until you've met a gene, its rule once decoded (or always, with
// Audit Trail). Its tells after them.
function geneLine(s, n) {
  if (!n.genes) return '';
  const deep = !!s.breach.fx.audit, chips = n.genes.map((id) => geneChip(chipOf(s, id, 'rolled', deep)));
  const tells = s.breach.fx.audit === 2 ? (n.tells || []).map((id) => `<span class="tag" title="A tell it brings.">${esc(id)}</span>`) : [];
  return chips.length || tells.length ? `<span class="gene-line bx-genes">${chips.join('')}${tells.join('')}</span>` : '<span class="gene-line bx-genes"><span class="gchip g-core" title="It rolled no genes: the body alone.">body only</span></span>';
}
// Geometry: a gutter for the subsystem names, then four lanes. y in px, x in % of the board.
const G = { gut: 21, row: 78, head: 46, gate: 84, pad: 34 };
const laneX = (col) => G.gut + ((col + 0.5) * (100 - G.gut - 2)) / BREACH.cols;

function layout(map) {
  const ys = {}, heads = [], acts = map.acts || ACTS.length, rows = map.rows || BREACH.rows;
  let y = G.pad;
  for (let act = 0; act < acts; act++) {
    heads.push({ act, y });
    y += G.head;
    for (let row = 0; row < rows; row++) { ys[`${act}:${row}`] = y + G.row / 2; y += G.row; }
    ys[`${act}:${rows}`] = y + G.gate / 2; y += G.gate;
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
  if (n.kind === 'boss') return `${residentName(cardOf(s))}, level ${n.level}. ${residentAbout(n.boss)}`;
  const where = n.sub ? `This row runs ${n.sub}, ${SUBSYSTEMS[n.sub].about}. ` : '';
  if (n.kind === 'virus' || n.kind === 'elite') {
    const fam = n.strain ? STRAINS[n.strain].name : FAMILIES[n.family]?.name;
    return `${where}${n.kind === 'elite' ? 'An elite' : 'A'} level ${n.level} ${fam} virus, written by ${AUTHORS[n.author]?.name || '?'}. ${n.reward ? rewardTip(n) : ''} ${n.kind === 'elite' ? 'Its rewrite is tier II, and it pays a reroll.' : 'Then the rewrite.'}${b.cleared[n.id] ? ' You cleared it.' : ''}`;
  }
  if (n.kind === 'broker') return `${BROKERS[n.faction].name} sells ${BROKERS[n.faction].sells.toLowerCase()} here.`;
  return where + KIND[n.kind].word;
}

// A row's subsystem in the gutter: what it runs and, once rewritten, the rewrite's name (its Now and Output on hover).
const rwName = (held) => REWRITES[held.id].name + (held.tier > 1 ? ' II' : '');
function gutTip(sub, held) {
  if (!sub) return 'A rest row: a defrag or a broker before the gate.';
  if (!held) return `${sub} runs ${SUBSYSTEMS[sub].about}. Win a fight on this row to rewrite it.`;
  const r = REWRITES[held.id];
  return `${rwName(held)} on ${sub}: Now: ${r.now} Output: ${r.output[Math.min(1, held.tier - 1)]}`;
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
  const card = cardOf(s), rows = map.rows || BREACH.rows;
  const headMarks = heads.map(({ act, y }) => {
    const [a, c] = card.subsystems[act], lvl = b.level + BREACH.actLevel[act];
    const done = here && (here.act > act || (here.act === act && here.kind === 'gate' && b.cleared[here.id]));
    return `<div class="bx-act${here?.act === act || (!here && act === 0) ? ' on' : ''}${done ? ' done' : ''}" style="top:${y}px"><span class="bx-act-n">ACT ${act + 1}</span><b>${esc(ACTS[act].name)}</b><span class="bx-act-sub">/${esc(ACTS[act].dir)} · ${esc(a)}, ${esc(c)} · lv ${lvl}</span></div>`;
  }).join('');
  // The gutter: each row's subsystem, and its rewrite once you have one.
  const gut = [];
  for (let act = 0; act < (map.acts || ACTS.length); act++) for (let row = 0; row < rows; row++) {
    const any = nodeList(map).find((n) => n.act === act && n.row === row);
    if (!any) continue;
    const sub = rowSub(act, row, card), held = sub && b.rewrites[sub];
    const fogged = !visible(s, any);
    gut.push(`<div class="bx-gut${held ? ' held' : ''}${fogged ? ' fog' : ''}" style="top:${pos[any.id].y}px" title="${esc(gutTip(sub, held))}"><span class="bx-gut-dir">${esc(sub ? sub + '/' : 'tmp/')}</span>${held ? `<small>${esc(rwName(held))}</small>` : ''}</div>`);
  }
  const nodes = nodeList(map).map((n) => {
    const p = pos[n.id], seen = visible(s, n), cleared = !!b.cleared[n.id], isHere = here?.id === n.id, can = reach.has(n.id);
    const k = KIND[n.kind] || KIND.virus;
    const state = isHere ? 'here' : cleared ? 'cleared' : can ? 'reach' : seen ? 'seen' : 'fog';
    const attrs = can ? `data-breach="go" data-arg="${esc(n.id)}"` : 'disabled';
    const tip = esc(nodeTip(s, n));
    if (n.kind === 'gate' || n.kind === 'boss') {
      const name = n.kind === 'gate' ? GUARDS[n.guard].name.toUpperCase() : residentName(card).toUpperCase();
      const note = n.kind === 'gate' ? 'banks your pack' : 'the Resident · /core';
      return `<button type="button" class="bx-bar k-${n.kind} s-${state}" style="top:${p.y}px" ${attrs} title="${tip}"><span class="ico" ${icon(k.icon)}></span><span class="bx-bar-k">${n.kind === 'gate' ? 'GATE' : 'RESIDENT'}</span><b>${esc(name)}</b><small>lv ${n.level} · ${esc(note)}</small>${isHere ? '<span class="bx-you">you</span>' : ''}${cleared ? '<span class="bx-done">down</span>' : ''}</button>`;
    }
    const label = seen ? k.label : '?';
    // A fight shows its reward in place of its author (who wrote it is in the tip and on its card).
    const fightNode = n.kind === 'virus' || n.kind === 'elite';
    const sub = seen && fightNode ? '' : seen && n.kind === 'broker' ? BROKERS[n.faction].name.toLowerCase() : seen && n.kind === 'term' ? EVENTS[n.event].file.split('/').pop() : '';
    const rw = seen && fightNode && !cleared ? rewardPill(n) : '';
    return `<button type="button" class="bx-node k-${seen ? n.kind : 'fog'} s-${state}" style="left:${p.x}%;top:${p.y}px" ${attrs} title="${tip}" aria-label="${esc(seen ? `${k.label} ${n.sub || ''}${n.reward && fightNode ? ` ${n.reward}` : ''}` : 'unknown node')}">`
      + `<span class="bx-chip">${seen ? `<span class="ico" ${icon(k.icon)}></span>` : '<span class="bx-q">?</span>'}</span>`
      + `${seen ? `<span class="bx-lbl">${esc(label)}</span>` : ''}${rw}${sub ? `<small class="bx-sub">${esc(sub)}</small>` : ''}${isHere ? '<span class="bx-you">you</span>' : ''}</button>`;
  }).join('');
  return `<div class="bx-board" style="height:${height}px">${headMarks}${gut.join('')}<svg class="bx-edges" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${nodes}</div>`;
}

// ---------- the decision ----------
// Every screen is one card: a kicker (where you are), the question as its h1, the options, then the actions.
const btn = (verb, label, { arg = null, primary = false, hot = false, disabled = false, note = '', tip = '' } = {}) => `<button type="button" class="btn${primary ? ' primary' : ''}${hot ? ' hot-btn' : ''}" data-breach="${verb}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}${tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</button>`;
const decision = (kicker, title, body, cls = '') => `<section class="card bx-screen${cls ? ' ' + cls : ''}"><h2>${kicker}</h2><h1>${title}</h1>${body}</section>`;
// A card's tags as chips (drafts.mjs linksOf): what it makes (an arrow out) and wants (an arrow in), lit teal where it
// meets your build, with what it meets on hover. The link count sits on the kicker.
function tagChips(s, c, build) {
  const L = linksOf(s, c, build);
  if (!L.tags.length) return { html: '', n: 0 };
  const chip = (x) => {
    const T = TAGS[x.tag], on = x.on;
    const tip = x.side === 'wants' ? `Wants: ${T.tip}${on ? ` Your build makes it (${x.count}).` : ' Nothing in your build makes it yet.'}` : `Makes: ${T.tip}${on ? ` ${x.count === 1 ? 'A card' : `${x.count} cards`} of yours ${x.count === 1 ? 'wants' : 'want'} it.` : ''}`;
    return `<span class="bx-tag ${x.side === 'wants' ? 'w' : 'm'}${on ? ' on' : ''}" title="${esc(tip)}">${x.side === 'wants' ? '◂ ' : ''}${esc(T.word)}${x.side === 'makes' ? ' ▸' : ''}</span>`;
  };
  return { html: `<p class="bx-tags">${L.tags.map(chip).join('')}</p>`, n: L.n };
}
const fmtN = (n) => (n % 1 ? n.toFixed(1) : String(n));
const linkBadge = (n) => (n > 0 ? `<span class="bx-link" title="${esc(`Links with your build: ${fmtN(n)} (its lit tags).`)}">×${fmtN(n)}</span>` : '');
function cardTile(s, c, i, verb, extra = '', build = buildTags(s)) {
  const t = cardText(c), b = s.breach;
  if (c.kind === 'gear') {
    const it = c.item, rule = it.rule ? effectLine(it) : '';
    return `<li class="bx-card k-gear r-${it.rarity}"><span class="bx-card-k">Gear · ${esc(RARITIES[it.rarity].name)}</span><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><p>${esc(statLine(it.stats))}</p>${rule ? `<p class="bx-rule">${esc(rule)}</p>` : ''}${extra}<div class="bx-card-act">${btn(verb, 'Take', { arg: i })}</div></li>`;
  }
  const replaces = c.kind === 'mod' && b.mods.find((id) => MODS[id].skill === MODS[c.id].skill && id !== c.id);
  const tags = tagChips(s, c, build);
  return `<li class="bx-card k-${c.kind} r-${c.rarity}"><span class="bx-card-k">${esc(t.kicker)}${linkBadge(tags.n)}</span><b>${esc(t.name)}</b><p>${esc(t.text)}</p>${tags.html}${replaces ? `<p class="bx-rule">Replaces ${esc(modName(replaces, b.plus.includes(replaces)))}.</p>` : ''}${extra}<div class="bx-card-act">${btn(verb, 'Take', { arg: i })}</div></li>`;
}
// Your build, over a draft: what it makes, as lit chips with counts (the kit's and your cards').
function buildLine(build) {
  const xs = Object.entries(build.makes).filter(([t]) => TAGS[t]).sort((a, c) => c[1] - a[1]);
  return xs.length ? `<p class="bx-build" title="Your build: what your kit and your cards make. A card's tag lights up where it meets one."><span class="lbl">Build</span>${xs.map(([t, n]) => `<span class="bx-tag m on" title="${esc(TAGS[t].tip)}">${esc(TAGS[t].word)}${n > 1 ? ` ×${n}` : ''}</span>`).join('')}</p>` : '';
}
function screenMarkup(s) {
  const b = s.breach, sc = b.screen;
  if (!sc) {
    // Nothing to decide but where to go: one line, and under it the lit nodes as cards (what you know of each), so
    // the column isn't empty and a click there moves you too.
    const lit = reachable(s);
    const head = `<div class="bx-idle-k"><span class="ico" ${icon('chevron')}></span><b>${b.at ? 'Pick your next node' : 'Jack in: pick a first node'}</b><small>${lit.length ? `${lit.length} lit on the map` : 'nothing in reach'}</small></div>`;
    return `<section class="bx-screen bx-idle" aria-live="polite">${head}${lit.length ? `<ul class="bx-peek">${lit.map((n) => peekCard(s, n)).join('')}</ul>` : ''}</section>`;
  }
  const path = esc((sc.node ? b.map.nodes[sc.node] : currentNode(s))?.path || '/');
  if (sc.kind === 'draft') {
    const can = b.rerolls > 0, build = buildTags(s);
    const kind = sc.draft === 'elite' ? 'cve' : sc.draft, promise = REWARD[kind] ? ` · ${rewardPill({ reward: kind, rare: sc.rare }, 'bx-rw in')}` : '';
    return decision(`${path} · ${esc(sc.title === 'Draft' ? 'draft' : sc.title)}${promise}`, `Pick 1 of ${sc.cards.length}`, `${buildLine(build)}<ul class="bx-cards">${sc.cards.map((c, i) => cardTile(s, c, i, 'pick', '', build)).join('')}</ul><div class="row acts">${sc.noSkip ? '' : btn('skip', 'Skip', { note: b.rules?.audit ? 'pays nothing' : `+${DRAFT.skip} tokens` })}${btn('reroll', 'Reroll', { disabled: !can, note: `${b.rerolls} left` })}</div>`);
  }
  if (sc.kind === 'rewrite') {
    const tiles = sc.options.map((id, i) => {
      const r = REWRITES[id], on = sc.was?.id === id; // re-imaging: what the server runs there now
      const was = on ? `<span class="bx-card-k bx-was" title="Runs now: the server runs this today. Pick it to keep it, at the better of the two tiers.">Runs now${sc.was.tier > 1 ? ' · II' : ''}</span>` : '';
      return `<li class="bx-card k-rewrite${on ? ' on' : ''}">${was}<b>${esc(r.name)}${sc.tier > 1 ? ' II' : ''}</b><p><span class="bx-now" title="Now: applies for the rest of this breach.">Now</span>${esc(r.now)}</p><p class="bx-out"><span title="Output: what the server does for you once it is captured.">Output</span>${esc(r.output[sc.tier - 1])}</p><div class="bx-card-act">${btn('pick', on ? 'Keep' : 'Rewrite', { arg: i })}</div></li>`;
    }).join('');
    return decision(`Rewrite · ${esc(sc.sub)}/ · ${esc(SUBSYSTEMS[sc.sub].about)}${sc.tier > 1 ? ' · tier II' : ''}`, `Rewrite ${esc(sc.sub)}`, `<ul class="bx-cards two">${tiles}</ul>`);
  }
  if (sc.kind === 'cache') {
    const n = b.map.nodes[sc.node];
    return decision(`${path} · cache`, 'Cache',`${term([`$ ls -l ${n.path}`, '-rw-------  1 ops ops  48k  cache.dat', ...(sc.read ? [`$ cat cache.dat`, n.bait ? 'CANARY CANARY CANARY CANARY (every block)' : `tokens: ${n.tokens}${n.gear ? ' · protocol.bin' : ''}`] : [])])}<div class="row acts">${btn('cat', 'cat cache.dat', { disabled: sc.read, tip: 'cat: read the file first. One cache in four is bait.' })}${btn('pull', 'pull', { hot: true, note: sc.read && n.bait ? 'bait' : '' })}${btn('leave', 'leave')}</div>`);
  }
  if (sc.kind === 'defrag') {
    const heal = Math.min(maxOf(s) - signalOf(s), Math.round(b.max * restShare(b)));
    if (sc.recompile) return decision(`${path} · recompile`, 'Recompile a mod', recompileList(s, 'plus') + `<div class="row acts">${btn('done', sc.rested ? 'Done' : 'Not now')}</div>`);
    if (sc.reslot) {
      const bar = equippedSkills(s, classOf(s)), spare = knownSkills(s, classOf(s)).filter((id) => !bar.includes(id));
      const row = (id, on) => `<li class="bx-slot${on ? ' on' : ''}"><b>${esc(ABILITIES[id]?.name || id)}</b>${b.mods.find((m) => MODS[m].skill === id) ? `<small class="bx-modtag">${esc(MODS[b.mods.find((m) => MODS[m].skill === id)].name)}</small>` : ''}${btn('slot', on ? 'Unequip' : 'Equip', { arg: `${on ? 'unequip' : 'equip'} ${id}` })}</li>`;
      return decision(`${path} · re-slot`, 'Your keys', `<ul class="bx-slots">${bar.map((id) => row(id, true)).join('')}${spare.map((id) => row(id, false)).join('')}</ul><div class="row acts">${btn('done', 'Done', { primary: true })}</div>`);
    }
    const zero = b.cves.includes('zerologon'), mods = recompilable(b).length;
    return decision(`${path} · defrag${zero ? ' · <span class="bx-half" title="Zerologon: rest and recompile both.">Zerologon</span>' : ''}`, 'Rest, recompile or re-slot', `<div class="row acts">${btn('rest', 'Rest', { primary: true, note: `+${heal} Signal` })}${btn('recompile', 'Recompile', { disabled: !mods, note: mods ? 'a mod to +' : 'no mod', tip: 'Recompile: one of your mods becomes its + version for the rest of the breach.' })}${btn('reslot', 'Re-slot', { note: 'change your keys', tip: 'Re-slot: change the skills on your bar. A defrag is the only place your bar changes.' })}${b.fx.service ? btn('jackout', 'Jack out', { hot: true, note: 'keep the pack', tip: 'Service Account: jack out here with your pack. The server stays uncaptured.' }) : ''}</div>`);
  }
  if (sc.kind === 'broker') {
    const B = BROKERS[sc.faction], price = (x) => priceOf(b, sc, x), build = buildTags(s);
    if (sc.recompile) return decision(`${path} · ${esc(B.name)} · recompile`, 'Recompile a mod', recompileList(s, 'service', `${price(B.service.price)} tokens`) + `<div class="row acts">${btn('leave', 'Leave', { primary: true })}</div>`);
    const tiles = sc.stock.map((c, i) => cardTile(s, c, i, 'buy', `<span class="bx-price${b.tokens < price(c.price) ? ' short' : ''}">${c.sold ? 'sold' : `${price(c.price)} tokens`}</span>`, build).replace('>Take<', c.sold ? ' disabled>Sold<' : '>Buy<')).join('');
    const sv = B.service ? btn('service', B.service.name, { disabled: sc.served || b.tokens < price(B.service.price) || (B.service.id === 'recompile' && !recompilable(b).length), note: `${price(B.service.price)} tokens`, tip: B.service.text }) : '';
    return decision(`${path} · broker${sc.half ? ' · <span class="bx-half">half price</span>' : ''}`, esc(B.name), `${buildLine(build)}<ul class="bx-cards">${tiles}</ul><div class="row acts">${btn('patch', 'Patch Signal', { disabled: sc.patched, note: `+25% · ${price(B.patch)} tokens` })}${sv}${btn('leave', 'Leave', { primary: true })}</div>`);
  }
  if (sc.kind === 'term') {
    const ev = EVENTS[sc.event];
    return decision(`${path} · terminal`, esc(ev.name), `${term([`$ cat ${ev.file}`, ...ev.lines])}<ul class="bx-opts">${ev.options.map((o, i) => `<li>${btn('choose', o.label, { arg: i, hot: /Costs/.test(o.text) })}<span>${esc(eventText(b.map.nodes[sc.node], o.text, b.map.acts))}</span></li>`).join('')}</ul>`);
  }
  if (sc.kind === 'gate') {
    const n = b.map.nodes[sc.node], pack = b.pack.map((id) => stashItem(s, id)).filter(Boolean);
    const banks = pack.length ? `<h3 class="bx-sec">Banks as you pass <small>${pack.length}</small></h3><ul class="bx-items">${pack.map((it) => itemRow(s, it)).join('')}</ul>` : '';
    return decision(`${esc(n.path)} · gate`, `${esc(GUARDS[n.guard].name)} down`, `${banks}<div class="row acts">${btn('goon', 'Go on', { primary: true, note: `act ${n.act + 2}` })}${btn('jackout', 'Jack out', { hot: true, tip: `Jack out: bank your pack and leave ${cardOf(s).name} uncaptured.${b.card ? ' The gate stays a checkpoint: a retry can start past it.' : ''}` })}</div>`);
  }
  return '';
}
// The mods you can recompile, each with what it does now and as its + version. verb: the button's (plus at a defrag,
// service at NULL CHOIR's stall).
function recompileList(s, verb, note = '') {
  const b = s.breach;
  return `<ul class="bx-plus">${recompilable(b).map((id) => `<li><span class="bx-card-k">Mod · ${esc(ABILITIES[MODS[id].skill]?.name || MODS[id].skill)}</span><b>${esc(MODS[id].name)} <span class="bx-arrow">→</span> <span class="you">${esc(modName(id, true))}</span></b><p class="bx-was-t">${esc(modText(id))}</p><p class="bx-plus-t">${esc(modText(id, true))}</p>${btn(verb, 'Recompile', { arg: id, note })}</li>`).join('')}</ul>`;
}
// A lit node as a card: its kind, where it runs, its level, and what you know of it. The whole card is the move.
function peekCard(s, n) {
  const b = s.breach, k = KIND[n.kind] || KIND.virus;
  let name = k.label, know = '';
  const meta = [];
  if (n.kind === 'gate') { name = GUARDS[n.guard].name; know = `${GUARDS[n.guard].summary} Beat it and your pack banks.`; }
  else if (n.kind === 'boss') { name = residentName(cardOf(s)); know = residentAbout(n.boss); }
  else if (n.kind === 'virus' || n.kind === 'elite') {
    const fam = n.strain ? STRAINS[n.strain].name : FAMILIES[n.family]?.name;
    name = n.kind === 'elite' ? `Elite ${fam}` : fam;
    meta.push(AUTHORS[n.author]?.name || '');
    know = n.kind === 'elite' ? 'Its rewrite is tier II, and it pays a reroll.' : n.sub ? `A rewrite of ${n.sub} after.` : '';
  } else if (n.kind === 'broker') { name = BROKERS[n.faction].name; know = `Sells ${BROKERS[n.faction].sells.toLowerCase()} for tokens.`; }
  else if (n.kind === 'term') { name = EVENTS[n.event].file.split('/').pop(); know = k.word; }
  else know = k.word;
  if (n.sub) meta.unshift(`${n.sub}/`);
  const lvl = ['virus', 'elite', 'gate', 'boss'].includes(n.kind) ? `<span class="bx-peek-lv">lv ${n.level}</span>` : '';
  const ahead = [...new Set(nextOf(b.map, n.id).filter((x) => visible(s, x)).map((x) => KIND[x.kind]?.label || x.kind))];
  const then = ahead.length ? `<span class="bx-peek-next" title="Then: where this node leads, as far as you can read.">then ${esc(ahead.join(' · '))}</span>` : '';
  const kick = [k.label, ...meta.filter(Boolean)].join(' · ');
  const fightNode = n.kind === 'virus' || n.kind === 'elite';
  const rw = fightNode ? rewardPill(n) : '', genes = fightNode ? geneLine(s, n) : '';
  return `<li><button type="button" class="bx-peek-card k-${n.kind}" data-breach="go" data-arg="${esc(n.id)}" title="${esc(nodeTip(s, n))}"><span class="bx-peek-ico"><span class="ico" ${icon(k.icon)}></span></span><span class="bx-peek-b"><span class="bx-peek-top"><span class="bx-card-k">${esc(kick)}</span>${lvl}</span><b>${esc(name)}</b>${rw || genes ? `<span class="bx-peek-row">${rw}${genes}</span>` : ''}${know ? `<small>${esc(know)}</small>` : ''}${then}</span></button></li>`;
}
const term = (lines) => `<pre class="bx-term">${lines.map((l) => (l.startsWith('$') ? `<span class="you">${esc(l)}</span>` : esc(l))).join('\n')}</pre>`;

// ---------- the end ----------
// What the campaign adds to the end card (campaign.mjs fills b.report): the bounty, what the capture unlocked, the
// servers it opened, a checkpoint kept.
function reportMarkup(b) {
  const r = b.report;
  if (!r) return '';
  const rows = [];
  if (r.bounty) rows.push(`<li class="${r.bounty.done ? '' : 'stock'}"><span class="cap-sub">bounty</span><b>${esc(r.bounty.done ? 'Paid' : 'Missed')}</b><span>${esc(r.bounty.text)}${esc(r.bounty.done ? ` ${r.bounty.paid}` : ' Missing it costs nothing.')}</span></li>`);
  for (const u of r.unlocks || (r.unlock ? [r.unlock] : [])) rows.push(`<li><span class="cap-sub">unlock</span><b>${esc(u.name)}</b><span>${esc(`Joins your draft pool. ${u.text}`)}</span></li>`);
  if (r.heat) rows.push(`<li><span class="cap-sub">heat</span><b>Heat ${r.heat} open</b><span>${esc(`${HEAT[r.heat].name}: ${HEAT[r.heat].text}`)}</span></li>`);
  if (r.replay) rows.push(`<li><span class="cap-sub">replay</span><b>Replayed</b><span>The Resident falls again. The server is as it was.</span></li>`);
  if (r.revealed?.length) rows.push(`<li><span class="cap-sub">links</span><b>${r.revealed.length} open</b><span>${esc(r.revealed.join(', '))}</span></li>`);
  if (r.checkpoint) rows.push(`<li><span class="cap-sub">kept</span><b>Checkpoint</b><span>${esc(`A retry can start past gate ${r.checkpoint}, with the rewrites behind it.`)}</span></li>`);
  return rows.length ? `<ul class="cap-lines cap-report">${rows.join('')}</ul>` : '';
}
function resultMarkup(s) {
  const b = s.breach, card = cardOf(s), camp = !!b.card;
  const again = camp
    ? `<div class="row acts"><button type="button" class="btn primary" data-camp="leave">Back to the map</button><button type="button" class="btn" data-module="loadout">Loadout</button></div>`
    : `<div class="row acts"><button type="button" class="btn primary" data-breach="again">New breach</button><button type="button" class="btn" data-module="loadout">Loadout</button></div>`;
  if (b.result === 'won') {
    const c = captureOf(s);
    const lines = c.rewrites.map(({ sub, held, kept }) => { const o = outputLine(sub, held); return `<li class="${held ? '' : 'stock'}"><span class="cap-sub">${esc(sub)}</span><b>${esc(o.name)}${kept ? ' <small class="cap-kept" title="Kept: you did not clear it this time, so the rewrite it ran stays.">kept</small>' : ''}</b><span>${esc(o.text)}</span></li>`; }).join('');
    const loot = c.items.map((it) => `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b></li>`).join('');
    const dump = c.dump ? `<div class="cap-dump"><div class="cap-dump-k"><b>${esc(c.dump.title)}</b><span>${esc(c.dump.from)}</span><span class="cap-frag">${esc(c.dump.thread)} ${c.dump.n}/${c.dump.of}</span></div><pre>${c.dump.lines.map(esc).join('\n')}</pre></div>` : '';
    return `<section class="card bx-capture"><div class="cap-kick"><span>${b.report?.reimaged ? 'RE-IMAGED' : 'CAPTURED'}</span><span>${camp ? `level ${b.level} · ` : ''}heat ${b.heat || 0}</span></div><h1>${esc(card.name)}</h1><p class="svc-line">${esc(card.kind)} · ${esc(card.author.toUpperCase())} · ${c.kills} fights · Resident ${esc(residentName(card))} down</p>
      <ul class="cap-lines">${lines}</ul>
      <div class="cap-stats"><div class="stat"><span>XP</span><b>+${c.xp.toLocaleString('en-US')}</b></div><div class="stat"><span>Loot banked</span><b>${c.items.length}</b></div><div class="stat"><span>Mods · CVEs</span><b>${b.mods.length} · ${b.cves.length}</b></div></div>
      ${reportMarkup(b)}
      ${loot ? `<ul class="cap-loot">${loot}</ul>` : ''}
      ${dump}
      ${again}</section>`;
  }
  if (b.result === 'lost') {
    const L = b.lost || { items: [], mods: [], cves: [] };
    return `<section class="card bx-capture lost"><div class="cap-kick"><span>SIGNAL LOST</span><span>${esc(card.name)}</span></div><h1>Disconnected</h1><p class="svc-line">${esc(L.why || '')}</p>
      <ul class="cap-lines"><li><span class="cap-sub">lost</span><b>${L.items.length} unbanked</b><span>${esc(L.items.join(', ') || 'nothing in the pack')}</span></li><li><span class="cap-sub">lost</span><b>drafts</b><span>${esc([...L.mods.map((m) => MODS[m].name), ...L.cves.map((c) => CVES[c].name)].join(', ') || 'none')}</span></li><li><span class="cap-sub">kept</span><b>+${b.xp.toLocaleString('en-US')} XP</b><span>${b.banked.length} banked ${b.banked.length === 1 ? 'item' : 'items'}. The server stays uncaptured.</span></li></ul>${reportMarkup(b)}${again}</section>`;
  }
  return `<section class="card bx-capture"><div class="cap-kick"><span>JACKED OUT</span><span>${esc(card.name)}</span></div><h1>Out with the pack</h1><p class="svc-line">${b.banked.length} ${b.banked.length === 1 ? 'item' : 'items'} banked, +${b.xp.toLocaleString('en-US')} XP. The server stays uncaptured.</p>${reportMarkup(b)}${again}</section>`;
}

// ---------- the run: one strip ----------
// A piece of gear: its name (the item card on hover) and stats, and Equip, or a tag when it's already on.
function itemRow(s, it) {
  const on = Object.values(s.gear?.rigs || {}).flat().includes(it.id), can = !on && !s.breach.result;
  return `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><small>${esc(statLine(it.stats))}</small>${on ? '<span class="tag you">on</span>' : can ? btn('equip', 'Equip', { arg: it.id }) : ''}</li>`;
}
function hudMarkup(s) {
  const b = s.breach, sig = signalOf(s), max = maxOf(s), pct = max ? (sig / max) * 100 : 0;
  const lvl = pct <= 30 ? 'low' : pct <= 60 ? 'mid' : 'ok';
  const pack = b.pack.map((id) => stashItem(s, id)).filter(Boolean);
  const banked = b.banked.map((id) => stashItem(s, id)).filter(Boolean);
  const here = currentNode(s), lastAct = (here?.act ?? 0) >= (b.map.acts || ACTS.length) - 1 || here?.kind === 'boss', card = cardOf(s);
  const where = lastAct ? 'banks on capture' : 'banks at the gate';
  const fresh = pack.some((it) => !bxUi.seen.has(it.id));
  const perk = (cls, name, tip) => `<li class="bx-perk ${cls}" title="${esc(tip)}">${esc(name)}</li>`;
  const mods = b.mods.map((id) => { const plus = b.plus.includes(id); return perk(`mod${plus ? ' plus' : ''}`, modName(id, plus), `${modName(id, plus)} · mod on ${ABILITIES[MODS[id].skill]?.name || MODS[id].skill}: ${modText(id, plus)}`); }).join('');
  const cves = b.cves.map((id) => perk(`cve r-${{ common: 'stock', uncommon: 'tuned', rare: 'custom' }[CVES[id].rarity]}`, CVES[id].name, `${CVES[id].name} · ${CVES[id].rarity} CVE: ${CVES[id].text}`)).join('');
  const packBtn = pack.length || banked.length
    ? `<button type="button" class="bx-stat bx-packbtn${fresh ? ' new' : ''}${bxUi.pack ? ' on' : ''}" data-bx-ui="pack" aria-expanded="${bxUi.pack}" title="${esc(`Pack: gear you picked up on this breach. It ${lastAct ? 'banks when you capture the server' : 'banks at the next gate'}. If your Signal hits 0 first, it is lost.`)}"><span class="lbl">${pack.length ? 'Pack' : 'Banked'}</span><b>${pack.length || banked.length}</b>${pack.length ? `<small>${where}</small>` : ''}<span class="ico" ${icon('chevron')}></span></button>`
    : '';
  const pop = bxUi.pack && packBtn ? `<div class="bx-pop" role="dialog" aria-label="Pack">
      ${pack.length ? `<h3 class="bx-sec">Pack <small>${where}</small></h3><ul class="bx-items">${pack.map((it) => itemRow(s, it)).join('')}</ul>` : ''}
      ${banked.length ? `<h3 class="bx-sec">Banked <small>${banked.length}</small></h3><ul class="bx-items">${banked.map((it) => itemRow(s, it)).join('')}</ul>` : ''}
    </div>` : '';
  return `<header class="bx-hud" aria-label="Your run">
    <span class="bx-hud-id" title="${esc(`${card.name}: A ${card.author.toUpperCase()} ${card.kind} at level ${b.level}. Its Resident is ${residentName(card)}. You read ${fogOf(s)} rows ahead.`)}"><span class="ico" ${icon('server')}></span><b>${esc(card.name)}</b></span>
    <div class="bx-sig ${lvl}" title="Signal: your health for the whole breach. It carries from fight to fight, and only a defrag or a broker's patch restores it."><span class="lbl">Signal</span><span class="sigbar"><span style="width:${pct.toFixed(1)}%"></span></span><strong>${sig}</strong><small>/${max}</small></div>
    <span class="bx-stat" title="Tokens: spend them at a broker. Skipping a draft pays ${DRAFT.skip}."><span class="lbl">Tokens</span><b>${b.tokens}</b></span>
    <span class="bx-stat${b.rerolls ? '' : ' out'}" title="Rerolls: draw a draft's cards again. An elite pays one."><span class="lbl">Rerolls</span><b>${b.rerolls}</b></span>
    ${heatStat(b)}
    ${packBtn ? `<div class="bx-packwrap">${packBtn}${pop}</div>` : ''}
    ${mods || cves ? `<ul class="bx-perks" aria-label="Mods and CVEs">${mods}${cves}</ul>` : ''}
  </header>`;
}
// Heat on the strip: its rank, and every modifier in force on hover.
export function heatStat(b) {
  const h = b.heat || 0;
  if (!h) return '';
  const tip = `Heat ${h}: ${heatList(h).map((x) => `${x.name}. ${x.text}`).join(' ')} ${heatPay(h)}`;
  return `<span class="bx-stat bx-heat" title="${esc(tip)}"><span class="lbl">Heat</span><b>${h}</b></span>`;
}
// The tty: its last two lines, and the last twelve when you open it.
function logMarkup(s) {
  const all = s.breach.log, lines = all.slice(bxUi.log ? -12 : -2);
  return `<section class="bx-log${bxUi.log ? ' open' : ''}"><button type="button" class="bx-log-k" data-bx-ui="log" aria-expanded="${bxUi.log}"><span>tty · ${esc(cardOf(s).id)}</span><span class="ico" ${icon(bxUi.log ? 'collapse' : 'expand')}></span></button><div class="bx-log-lines">${lines.map((l) => `<div${l.startsWith('cd ') ? ' class="you"' : ''}>${esc(l.startsWith('cd ') ? '$ ' + l : l)}</div>`).join('')}</div></section>`;
}

export function breachMarkup(s) {
  const b = s.breach;
  if (!b) return '<section class="card"><h2>Breach</h2><h1>No breach running</h1></section>';
  for (const id of [...bxUi.seen]) if (!b.pack.includes(id)) bxUi.seen.delete(id);
  const focus = b.result || b.screen ? ' focus' : '';
  return `<div class="bx${b.result ? ' over' : ''}">
    ${hudMarkup(s)}
    <section class="panel bx-map" data-pane="tree ${esc(cardOf(s).id)}"><div class="bx-scroll" id="bx-scroll">${mapMarkup(s)}</div></section>
    <aside class="bx-side${focus}">${b.result ? resultMarkup(s) : screenMarkup(s)}${logMarkup(s)}</aside>
  </div>`;
}
// Where the map should scroll to: the row you're on.
export function breachFocusY(s) {
  const b = s.breach;
  if (!b) return 0;
  const { pos } = layout(b.map), n = currentNode(s);
  return n ? pos[n.id].y : 0;
}

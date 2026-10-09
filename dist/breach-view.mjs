// The breach page (breach.mjs): a slim strip of run state across the top, the branching map as a drawing, and beside
// it the one decision in front of you (a rewrite, a cache, a stall, a terminal, a vault, a switch, a gate), with a
// short tty under it. docs/ui.md tokens and components; the map is the centre, the decision is the focus.
import { esc } from './view.mjs';
import { ABILITIES, GUARDS, FAMILIES, STRAINS, BOSSES } from './data.mjs';
import { itemLabel, statLine } from './gear.mjs';
import { stashItem, equippedSkills, knownSkills, classOf } from './combat.mjs';
import { AUTHORS } from './authors.mjs';
import { FRAGMENTS } from './campaign.mjs';
import { ACTS, BREACH, EVENTS, BROKERS, dropName, TRACE, KINDS, SWITCHES, nodeList, reachable, visible, currentNode, rowSub, signalOf, maxOf, captureOf, fogOf, eventText, cardOf, residentName, priceOf, exitsOf, restShare } from './breach.mjs';
import { SCRIPTS, TIER, scriptsOf, slotsOf, scriptTip } from './scripts.mjs';
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
  virus: { label: 'virus', icon: 'pulse-node', word: 'A wild virus. Beat it to rewrite its subsystem.' },
  elite: { label: 'elite', icon: 'mutation', word: 'A bigger virus with two tells. Loud: it raises your Trace. It drops gear now and then, and its rewrite is tier II.' },
  cache: { label: 'cache', icon: 'loot', word: 'Tokens, and now and then a script. One cache in four is bait, so read it before you pull it.' },
  defrag: { label: 'defrag', icon: 'shell-shield', word: 'A quiet sector. Rest for Signal, or re-slot your keys.' },
  broker: { label: 'broker', icon: 'exploit', word: "A broker's stall. Spend tokens on scripts or a Signal patch." },
  term: { label: 'term', icon: 'command', word: 'A terminal with a file on it, and a choice with a cost.' },
  vault: { label: 'vault', icon: 'event-lock', word: 'A vault door. A keycard opens it; forcing it is loud. Vaults hold the good stuff.' },
  switch: { label: 'switch', icon: 'interrupt', word: 'A security switch. Take it down and the act gets weaker.' },
  gate: { label: 'gate', icon: 'event-lock', word: 'A guard. Beat it and your pack banks.' },
  boss: { label: 'core', icon: 'server', word: 'The Resident.' },
  drop: { label: 'drop', icon: 'event-scan', word: "A dead drop wick left you: a note, and a script for your slots." },
};
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

// A dig in (world.mjs) on this server: its author's gene rides on every elite and gate.
function dugNote(s) {
  const d = cardOf(s).world?.digin;
  if (!d) return '';
  const c = chipOf(s, d.gene, 'rolled');
  return ` ${AUTHORS[d.author]?.name || d.author} dug in: it carries ${c.name || `${/^[aeiou]/i.test(c.catName) ? 'an' : 'a'} ${c.catName} you haven't seen`}.`;
}
// What a node says on hover, as much as you can read of it.
const vaultWord = (n) => (n.vault?.kind === 'script' ? 'A script, uncommon or better, and a log.' : `A protocol, ${n.vault?.rarity === 'custom' ? 'yellow' : 'blue'}, and a log.`);
function nodeTip(s, n) {
  const b = s.breach, seen = visible(s, n), hunter = b.hunter?.at === n.id ? ' The hunter ICE is here: step on it and you fight it.' : '';
  if (!seen) return `Out of sight. You read ${fogOf(s)} rows ahead.${hunter}`;
  if (n.kind === 'gate') return `${GUARDS[n.guard].name}, level ${n.level}. ${GUARDS[n.guard].summary}${dugNote(s)} Beat it and your pack banks.`;
  if (n.kind === 'boss') return `${residentName(cardOf(s))}, level ${n.level}. ${residentAbout(n.boss)}`;
  const where = n.sub ? `This row runs ${n.sub}, ${SUBSYSTEMS[n.sub].about}. ` : '';
  if (n.kind === 'virus' || n.kind === 'elite') {
    const fam = n.strain ? STRAINS[n.strain].name : FAMILIES[n.family]?.name;
    return `${where}${n.kind === 'elite' ? 'An elite' : 'A'} level ${n.level} ${fam} virus, written by ${AUTHORS[n.author]?.name || '?'}.${n.key ? ' It carries a keycard.' : ''} ${n.kind === 'elite' ? 'Loud: it raises your Trace by 15. Its rewrite is tier II.' : 'Then the rewrite.'}${b.cleared[n.id] ? ' You cleared it.' : ''}${hunter}`;
  }
  if (n.kind === 'broker') return `${BROKERS[n.faction].name} sells ${BROKERS[n.faction].sells.toLowerCase()} here.${hunter}`;
  if (n.kind === 'vault') return `${where}A vault. ${b.cleared[n.id] ? 'You were here.' : vaultWord(n)} A keycard opens it; forcing it costs Signal and raises your Trace by 35.${hunter}`;
  if (n.kind === 'switch') return `${where}A security switch: ${SWITCHES[n.effect].name.toLowerCase()}. ${eventText(n, SWITCHES[n.effect].text, b.map.acts)}${hunter}`;
  return where + KIND[n.kind].word + hunter;
}

// A row's subsystem in the gutter: what it runs and, once rewritten, the rewrite's name (its Output on hover).
const rwName = (held) => REWRITES[held.id].name + (held.tier > 1 ? ' II' : '');
function gutTip(sub, held) {
  if (!sub) return 'A rest row: a defrag or a broker before the gate.';
  if (!held) return `${sub} runs ${SUBSYSTEMS[sub].about}. Win a fight on this row to rewrite it.`;
  return `${rwName(held)} on ${sub}. Once you capture the server: ${REWRITES[held.id].output[Math.min(1, held.tier - 1)]}`;
}

function mapMarkup(s) {
  const b = s.breach, map = b.map, { pos, heads, height } = layout(map);
  const here = currentNode(s), reach = new Set(reachable(s).map((n) => n.id));
  const onPath = new Set(b.path.slice(1).map((id, i) => `${b.path[i]}>${id}`));
  // Edges first, under the nodes. A Relay's shortcuts bow out to the side, dashed.
  const edge = ([a, c], hop = false) => {
    const p = pos[a], q = pos[c], na = map.nodes[a], nc = map.nodes[c];
    if (!p || !q) return '';
    const walked = onPath.has(`${a}>${c}`), live = (here ? here.id === a : !na) && reach.has(c), seen = visible(s, na) && visible(s, nc);
    const cls = `${walked ? 'walked' : live ? 'live' : seen ? 'seen' : 'fog'}${hop ? ' hop' : ''}`;
    // Gates and the core are bars: edges meet them at the lane's x.
    const qx = nc.col == null ? p.x : q.x, px = na.col == null ? q.x : p.x;
    const y1 = p.y + (na.col == null ? 14 : 20), y2 = q.y - (nc.col == null ? 14 : 20);
    if (hop) { const mx = Math.max(px, qx) + 7; return `<path class="bx-e ${cls}" d="M${px} ${y1} Q${mx} ${(y1 + y2) / 2} ${qx} ${y2}" fill="none" vector-effect="non-scaling-stroke"/>`; }
    return `<line class="bx-e ${cls}" x1="${px}" y1="${y1}" x2="${qx}" y2="${y2}" vector-effect="non-scaling-stroke"/>`;
  };
  const edges = map.edges.map((x) => edge(x)).join('') + (map.shortcuts || []).filter(([a, c]) => visible(s, map.nodes[a]) || visible(s, map.nodes[c])).map((x) => edge(x, true)).join('');
  const card = cardOf(s), rows = map.rows || BREACH.rows;
  const headMarks = heads.map(({ act, y }) => {
    const [a, c] = card.subsystems[act], lvl = b.level + BREACH.actLevel[act];
    const done = here && (here.act > act || (here.act === act && here.kind === 'gate' && b.cleared[here.id]));
    const sw = b.switches?.[act] ? `<span class="bx-act-sw" title="${esc(`${SWITCHES[b.switches[act]].name} down. ${SWITCHES[b.switches[act]].text.replace('{Next}', act < (map.acts || 3) - 1 ? 'The gate' : 'The Resident')}`)}">switch down</span>` : '';
    return `<div class="bx-act${here?.act === act || (!here && act === 0) ? ' on' : ''}${done ? ' done' : ''}" style="top:${y}px"><span class="bx-act-n">ACT ${act + 1}</span><b>${esc(ACTS[act].name)}</b>${sw}<span class="bx-act-sub">/${esc(ACTS[act].dir)} · ${esc(a)}, ${esc(c)} · lv ${lvl}</span></div>`;
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
      const dug = n.kind === 'gate' && card.world?.digin && chipOf(s, card.world.digin.gene, 'rolled');
      const note = n.kind === 'gate' ? `banks your pack${dug ? ` · dug in · ${dug.name ? dug.name.toLowerCase() : '???'}` : ''}` : 'the Resident · /core';
      return `<button type="button" class="bx-bar k-${n.kind} s-${state}" style="top:${p.y}px" ${attrs} title="${tip}"><span class="ico" ${icon(k.icon)}></span><span class="bx-bar-k">${n.kind === 'gate' ? 'GATE' : 'RESIDENT'}</span><b>${esc(name)}</b><small>lv ${n.level} · ${esc(note)}</small>${isHere ? '<span class="bx-you">you</span>' : ''}${cleared ? '<span class="bx-done">down</span>' : ''}</button>`;
    }
    const label = seen ? k.label : '?';
    const sub = seen && n.kind === 'broker' ? BROKERS[n.faction].name.toLowerCase() : seen && n.kind === 'term' ? EVENTS[n.event].file.split('/').pop() : seen && n.kind === 'switch' ? SWITCHES[n.effect].name.toLowerCase() : '';
    const marks = [seen && n.key && !cleared ? '<span class="bx-mk key" title="A keycard rides on this virus.">key</span>' : '', b.hunter?.at === n.id ? '<span class="bx-mk hunt" title="The hunter ICE. It moves a node toward you every move you make.">hunter</span>' : ''].join('');
    return `<button type="button" class="bx-node k-${seen ? n.kind : 'fog'} s-${state}${b.hunter?.at === n.id ? ' hunted' : ''}" style="left:${p.x}%;top:${p.y}px" ${attrs} title="${tip}" aria-label="${esc(seen ? `${k.label} ${n.sub || ''}${n.key ? ' keycard' : ''}` : 'unknown node')}${b.hunter?.at === n.id ? ' hunter' : ''}">`
      + `<span class="bx-chip">${seen ? `<span class="ico" ${icon(k.icon)}></span>` : '<span class="bx-q">?</span>'}</span>`
      + `${seen ? `<span class="bx-lbl">${esc(label)}</span>` : ''}${marks}${sub ? `<small class="bx-sub">${esc(sub)}</small>` : ''}${isHere ? '<span class="bx-you">you</span>' : ''}</button>`;
  }).join('');
  return `<div class="bx-board" style="height:${height}px">${headMarks}${gut.join('')}<svg class="bx-edges" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${nodes}</div>`;
}

// ---------- the decision ----------
// Every screen is one card: a kicker (where you are), the question as its h1, the options, then the actions.
const btn = (verb, label, { arg = null, primary = false, hot = false, disabled = false, note = '', tip = '' } = {}) => `<button type="button" class="btn${primary ? ' primary' : ''}${hot ? ' hot-btn' : ''}" data-breach="${verb}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}${tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</button>`;
const decision = (kicker, title, body, cls = '') => `<section class="card bx-screen${cls ? ' ' + cls : ''}"><h2>${kicker}</h2><h1>${title}</h1>${body}</section>`;
// A script as a tile (a stall's stock, a vault's contents): its rarity in the item colours, its rule.
function scriptTile(id, act = '') {
  const x = SCRIPTS[id];
  return `<li class="bx-card k-script r-${TIER[x.rarity]}"><span class="bx-card-k">Script · ${esc(x.rarity)}</span><b class="iname r-${TIER[x.rarity]}">${esc(x.name)}</b><p>${esc(x.text)}</p><p class="bx-rule">Usable once per fight. Takes no cycle.</p>${act ? `<div class="bx-card-act">${act}</div>` : ''}</li>`;
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
  const node = sc.node ? b.map.nodes[sc.node] : currentNode(s), path = esc(node?.path || '/');
  if (sc.kind === 'rewrite') {
    const tiles = sc.options.map((id, i) => {
      const r = REWRITES[id], on = sc.was?.id === id; // re-imaging: what the server runs there now
      const was = on ? `<span class="bx-card-k bx-was" title="Runs now: the server runs this today. Pick it to keep it, at the better of the two tiers.">Runs now${sc.was.tier > 1 ? ' · II' : ''}</span>` : '';
      return `<li class="bx-card k-rewrite${on ? ' on' : ''}">${was}<b>${esc(r.name)}${sc.tier > 1 ? ' II' : ''}</b><p class="bx-out"><span title="Output: what the server does for you once it is captured. A rewrite does nothing on the breach you pick it in.">Output</span>${esc(r.output[sc.tier - 1])}</p><div class="bx-card-act">${btn('pick', on ? 'Keep' : 'Rewrite', { arg: i })}</div></li>`;
    }).join('');
    return decision(`Rewrite · ${esc(sc.sub)}/ · ${esc(SUBSYSTEMS[sc.sub].about)}${sc.tier > 1 ? ' · tier II' : ''}`, `Rewrite ${esc(sc.sub)}`, `<p class="bx-note">What the server does for you once you capture it.</p><ul class="bx-cards two">${tiles}</ul>`);
  }
  if (sc.kind === 'cache') {
    const n = node, body = sc.read ? (n.mirror ? ['FILE IS A MIRROR. YOUR HANDLE, REVERSED.'] : n.bait ? ['CANARY CANARY CANARY CANARY (every block)'] : [`tokens: ${n.tokens}${n.script ? ` · ${n.script}.sh` : ''}`]) : [];
    const pull = n.mirror && sc.read ? btn('pull', 'break the mirror', { hot: true, note: 'an elite' }) : btn('pull', 'pull', { hot: true, note: sc.read && n.bait ? 'bait' : '' });
    return decision(`${path} · cache`, 'Cache', `${term([`$ ls -l ${n.path}`, '-rw-------  1 ops ops  48k  cache.dat', ...(sc.read ? ['$ cat cache.dat', ...body] : [])])}<div class="row acts">${btn('cat', 'cat cache.dat', { disabled: sc.read, tip: 'cat: read the file first. One cache in four is bait.' })}${pull}${btn('leave', 'leave')}</div>`);
  }
  if (sc.kind === 'drop') {
    // A dead drop: wick's note (its fragment, while there's one left to find) and the script it holds.
    const n = node, f = n.frag && FRAGMENTS.find((x) => x.id === n.frag), full = n.script && scriptsOf(s).length >= slotsOf(s);
    const note = f ? f.lines : ['for you.', '— w'];
    return decision(`${path} · dead drop`, 'Dead drop', `${term([`$ ls -l ${n.path}`, '-rw-------  1 wick wick  2k  note.txt', ...(n.script ? [`-rwx------  1 wick wick  9k  ${n.script}.sh`] : []), ...(sc.read ? ['$ cat note.txt', ...note] : [])])}${sc.read && n.script ? `<ul class="bx-cards">${scriptTile(n.script)}</ul>` : ''}<div class="row acts">${btn('cat', 'cat note.txt', { disabled: sc.read })}${btn('pull', 'pull', { primary: true, disabled: full, note: full ? 'script slots full' : '', tip: 'pull: the script goes in your slots, and the note goes in your Archive when the breach ends, won or lost.' })}${btn('leave', 'leave', { tip: 'Leave it: the drop stays on the map until it goes cold.' })}</div>`);
  }
  if (sc.kind === 'defrag') {
    const heal = Math.min(maxOf(s) - signalOf(s), Math.round(b.max * restShare(b)));
    if (sc.reslot) {
      const bar = equippedSkills(s, classOf(s)), spare = knownSkills(s, classOf(s)).filter((id) => !bar.includes(id));
      const row = (id, on) => `<li class="bx-slot${on ? ' on' : ''}"><b>${esc(ABILITIES[id]?.name || id)}</b>${btn('slot', on ? 'Unequip' : 'Equip', { arg: `${on ? 'unequip' : 'equip'} ${id}` })}</li>`;
      return decision(`${path} · re-slot`, 'Your keys', `<ul class="bx-slots">${bar.map((id) => row(id, true)).join('')}${spare.map((id) => row(id, false)).join('')}</ul><div class="row acts">${btn('done', 'Done', { primary: true })}</div>`);
    }
    return decision(`${path} · defrag`, 'Rest or re-slot', `<div class="row acts">${btn('rest', 'Rest', { primary: true, note: `+${heal} Signal · Trace ${TRACE.rest}` })}${btn('reslot', 'Re-slot', { note: 'change your keys', tip: 'Re-slot: change the skills on your bar. A defrag is the only place your bar changes.' })}${b.fx.service ? btn('jackout', 'Jack out', { hot: true, note: 'keep the pack', tip: 'Service Account: jack out here with your pack. The server stays uncaptured.' }) : ''}</div>`);
  }
  if (sc.kind === 'broker') {
    const B = BROKERS[sc.faction], price = (x) => priceOf(b, sc, x), full = scriptsOf(s).length >= slotsOf(s);
    const tiles = sc.stock.map((c, i) => scriptTile(c.id, `<span class="bx-price${b.tokens < price(c.price) ? ' short' : ''}">${c.sold ? 'sold' : `${price(c.price)} tokens`}</span>${btn('buy', c.sold ? 'Sold' : 'Buy', { arg: i, disabled: c.sold || b.tokens < price(c.price) || full, tip: full ? `Your ${slotsOf(s)} script slots are full.` : '' })}`)).join('');
    const sv = B.service ? btn('service', B.service.name, { disabled: sc.served || b.tokens < price(B.service.price), note: `${price(B.service.price)} tokens`, tip: B.service.text }) : '';
    return decision(`${path} · broker${b.fx.discount ? ' · <span class="bx-half">Price Fix</span>' : ''}`, esc(B.name), `<ul class="bx-cards">${tiles}</ul><div class="row acts">${btn('patch', 'Patch Signal', { disabled: sc.patched, note: `+25% · ${price(B.patch)} tokens` })}${sv}${btn('leave', 'Leave', { primary: true })}</div>`);
  }
  if (sc.kind === 'term') {
    const ev = EVENTS[sc.event];
    return decision(`${path} · terminal`, esc(ev.name), `${term([`$ cat ${ev.file}`, ...ev.lines])}<ul class="bx-opts">${ev.options.map((o, i) => `<li>${btn('choose', o.label, { arg: i, hot: /Costs|Trace/.test(o.text) })}<span>${esc(eventText(node, o.text, b.map.acts))}</span></li>`).join('')}</ul>`);
  }
  if (sc.kind === 'vault') {
    const n = node;
    if (sc.opened) {
      const it = sc.got && n.vault?.kind === 'gear' ? stashItem(s, sc.got) : null;
      const got = it ? `<ul class="bx-items">${itemRow(s, it)}</ul>` : n.vault?.kind === 'script' ? (sc.got ? `<ul class="bx-cards">${scriptTile(n.vault.script)}</ul>` : `<p class="bx-note">${esc(SCRIPTS[n.vault.script].name)} stays in the vault: your script slots are full.</p>`) : '';
      return decision(`${path} · vault`, 'The vault is open', `${got}${n.vault?.log ? term([`$ cat vault.log`, n.vault.log]) : ''}<div class="row acts">${btn('leave', 'Leave', { primary: true })}</div>`);
    }
    return decision(`${path} · vault`, 'A vault door', `${term([`$ ls ${n.path}/vault`, 'ls: cannot open directory: Permission denied', `# badge reader: ${b.keys ? `${b.keys} ${b.keys === 1 ? 'keycard' : 'keycards'} on you` : 'no keycard'}`])}<div class="row acts">${btn('open', 'Open', { primary: true, disabled: !b.keys, note: b.keys ? `a keycard · Trace +${TRACE.open}` : 'needs a keycard' })}${btn('force', 'Force it', { hot: true, note: `10% Signal · Trace +${TRACE.force}` })}${btn('leave', 'Leave')}</div>`);
  }
  if (sc.kind === 'switch') {
    const n = node, S = SWITCHES[n.effect];
    return decision(`${path} · switch`, esc(S.name), `<p class="bx-note">${esc(eventText(n, S.text, b.map.acts))}</p><ul class="bx-opts"><li>${btn('fight', 'Fight its ICE', { hot: true })}<span>${esc(`A small watchdog. Beat it and the switch goes down. Lowers your Trace by ${-TRACE.ice}.`)}</span></li><li>${btn('splice', 'Splice it')}<span>${esc(`The switch goes down with no fight. Raises your Trace by ${TRACE.splice}.`)}</span></li><li>${btn('leave', 'Leave it')}<span>Nothing changes.</span></li></ul>`);
  }
  if (sc.kind === 'ahead') return decision(`${path} · hunter down`, 'Go on', `<p class="bx-note">The hunter is down. ${esc(node.path)} is still ahead of you.</p><div class="row acts">${btn('enter', 'Go on', { primary: true, arg: 1 })}</div>`);
  if (sc.kind === 'gate') {
    const n = node, pack = b.pack.map((id) => stashItem(s, id)).filter(Boolean);
    const banks = pack.length ? `<h3 class="bx-sec">Banks as you pass <small>${pack.length}</small></h3><ul class="bx-items">${pack.map((it) => itemRow(s, it)).join('')}</ul>` : '';
    return decision(`${esc(n.path)} · gate`, `${esc(GUARDS[n.guard].name)} down`, `${banks}<div class="row acts">${btn('goon', 'Go on', { primary: true, note: `act ${n.act + 2}` })}${btn('jackout', 'Jack out', { hot: true, tip: `Jack out: bank your pack and leave ${cardOf(s).name} uncaptured.${b.card ? ' The gate stays a checkpoint: a retry can start past it.' : ''}` })}</div>`);
  }
  return '';
}
// A lit node as a card: its kind, where it runs, its level, and what you know of it. The whole card is the move.
function peekCard(s, n) {
  const b = s.breach, k = KIND[n.kind] || KIND.virus;
  let name = k.label, know = '';
  const meta = [];
  if (n.kind === 'gate') { name = GUARDS[n.guard].name; know = `${GUARDS[n.guard].summary}${dugNote(s)} Beat it and your pack banks.`; }
  else if (n.kind === 'drop') { name = 'note.txt'; know = k.word; }
  else if (n.kind === 'boss') { name = residentName(cardOf(s)); know = residentAbout(n.boss); }
  else if (n.kind === 'virus' || n.kind === 'elite') {
    const fam = n.strain ? STRAINS[n.strain].name : FAMILIES[n.family]?.name;
    name = n.kind === 'elite' ? `Elite ${fam}` : fam;
    meta.push(AUTHORS[n.author]?.name || '');
    know = [n.key ? 'It carries a keycard.' : '', n.kind === 'elite' ? `Loud: Trace +${TRACE.elite}. Its rewrite is tier II.` : n.sub ? `A rewrite of ${n.sub} after.` : ''].filter(Boolean).join(' ');
  } else if (n.kind === 'broker') { name = BROKERS[n.faction].name; know = `Sells ${BROKERS[n.faction].sells.toLowerCase()} for tokens.`; }
  else if (n.kind === 'term') { name = EVENTS[n.event].file.split('/').pop(); know = k.word; }
  else if (n.kind === 'vault') { name = 'Vault'; know = `${vaultWord(n)} ${b.keys ? 'Your keycard opens it.' : 'You hold no keycard: forcing it is loud.'}`; }
  else if (n.kind === 'switch') { name = SWITCHES[n.effect].name; know = eventText(n, SWITCHES[n.effect].text, b.map.acts); }
  else know = k.word;
  if (n.sub) meta.unshift(`${n.sub}/`);
  const lvl = ['virus', 'elite', 'gate', 'boss'].includes(n.kind) ? `<span class="bx-peek-lv">lv ${n.level}</span>` : '';
  const ahead = [...new Set(exitsOf(b.map, n.id).filter((x) => visible(s, x)).map((x) => KIND[x.kind]?.label || x.kind))];
  const then = ahead.length ? `<span class="bx-peek-next" title="Then: where this node leads, as far as you can read.">then ${esc(ahead.join(' · '))}</span>` : '';
  const kick = [k.label, ...meta.filter(Boolean)].join(' · ');
  const genes = n.kind === 'virus' || n.kind === 'elite' ? geneLine(s, n) : '';
  const hunt = b.hunter?.at === n.id ? '<span class="bx-mk hunt">hunter</span>' : '';
  return `<li><button type="button" class="bx-peek-card k-${n.kind}${hunt ? ' hunted' : ''}" data-breach="go" data-arg="${esc(n.id)}" title="${esc(nodeTip(s, n))}"><span class="bx-peek-ico"><span class="ico" ${icon(k.icon)}></span></span><span class="bx-peek-b"><span class="bx-peek-top"><span class="bx-card-k">${esc(kick)}</span>${lvl}</span><b>${esc(name)}</b>${genes || hunt || n.key ? `<span class="bx-peek-row">${n.key ? '<span class="bx-mk key">key</span>' : ''}${hunt}${genes}</span>` : ''}${know ? `<small>${esc(know)}</small>` : ''}${then}</span></button></li>`;
}
const term = (lines) => `<pre class="bx-term">${lines.map((l) => (l.startsWith('$') ? `<span class="you">${esc(l)}</span>` : esc(l))).join('\n')}</pre>`;

// ---------- the end ----------
// What the campaign adds to the end card (campaign.mjs fills b.report): the bounty, Mail Drop's script, the servers
// it opened, a kept checkpoint.
function reportMarkup(b) {
  const r = b.report;
  if (!r) return '';
  const rows = [];
  if (r.bounty) rows.push(`<li class="${r.bounty.done ? '' : 'stock'}"><span class="cap-sub">bounty</span><b>${esc(r.bounty.done ? 'Paid' : 'Missed')}</b><span>${esc(r.bounty.text)}${esc(r.bounty.done ? ` ${r.bounty.paid}` : ' Missing it costs nothing.')}</span></li>`);
  if (r.mail) rows.push(`<li><span class="cap-sub">mail</span><b>${esc(SCRIPTS[r.mail].name)}</b><span>${esc(`Mail Drop sends you a script. ${SCRIPTS[r.mail].text}`)}</span></li>`);
  if (r.drop) rows.push(`<li><span class="cap-sub">drop</span><b>${esc(r.drop.script ? SCRIPTS[r.drop.script].name : 'note.txt')}</b><span>${esc(`${r.drop.script ? `${SCRIPTS[r.drop.script].text} ` : ''}${r.drop.frag ? "wick's note goes in your Archive." : 'From a dead drop.'}`)}</span></li>`);
  if (r.heat) rows.push(`<li><span class="cap-sub">heat</span><b>Heat ${r.heat} open</b><span>${esc(`${HEAT[r.heat].name}: ${HEAT[r.heat].text}`)}</span></li>`);
  if (r.replay) rows.push(`<li><span class="cap-sub">replay</span><b>Replayed</b><span>The Resident falls again. The server is as it was.</span></li>`);
  if (r.revealed?.length) rows.push(`<li><span class="cap-sub">links</span><b>${r.revealed.length} open</b><span>${esc(r.revealed.join(', '))}</span></li>`);
  if (r.checkpoint) rows.push(`<li><span class="cap-sub">kept</span><b>Checkpoint</b><span>${esc(`A retry can start past gate ${r.checkpoint}, with the rewrites behind it.`)}</span></li>`);
  return rows.length ? `<ul class="cap-lines cap-report">${rows.join('')}</ul>` : '';
}
function resultMarkup(s) {
  const b = s.breach, card = cardOf(s), camp = !!b.card;
  const again = camp
    ? `<div class="row acts"><button type="button" class="btn primary" data-camp="leave">Back to the room</button><button type="button" class="btn" data-module="loadout">Loadout</button></div>`
    : `<div class="row acts"><button type="button" class="btn primary" data-breach="again">New breach</button><button type="button" class="btn" data-module="loadout">Loadout</button></div>`;
  if (b.result === 'won') {
    const c = captureOf(s);
    const lines = c.rewrites.map(({ sub, held, kept }) => { const o = outputLine(sub, held); return `<li class="${held ? '' : 'stock'}"><span class="cap-sub">${esc(sub)}</span><b>${esc(o.name)}${kept ? ' <small class="cap-kept" title="Kept: you did not clear it this time, so the rewrite it ran stays.">kept</small>' : ''}</b><span>${esc(o.text)}</span></li>`; }).join('');
    const loot = c.items.map((it) => `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b></li>`).join('');
    const dump = c.dump ? `<div class="cap-dump"><div class="cap-dump-k"><b>${esc(c.dump.title)}</b><span>${esc(c.dump.from)}</span><span class="cap-frag">${esc(c.dump.thread)} ${c.dump.n}/${c.dump.of}</span></div><pre>${c.dump.lines.map(esc).join('\n')}</pre></div>` : '';
    return `<section class="card bx-capture"><div class="cap-kick"><span>${b.report?.reimaged ? 'RE-IMAGED' : 'CAPTURED'}</span><span>${camp ? `level ${b.level} · ` : ''}heat ${b.heat || 0}</span></div><h1>${esc(card.name)}</h1><p class="svc-line">${esc(card.kind)} · ${esc(card.author.toUpperCase())} · ${c.kills} fights · Resident ${esc(residentName(card))} down</p>
      <h3 class="bx-sec" title="What the server does for you from now on: each subsystem's rewrite. They run on your later breaches.">Output <small>${c.rewrites.filter((x) => x.held).length}/${c.rewrites.length}</small></h3>
      <ul class="cap-lines">${lines}</ul>
      <div class="cap-stats"><div class="stat"><span>XP</span><b>+${c.xp.toLocaleString('en-US')}</b></div><div class="stat"><span>Loot banked</span><b>${c.items.length}</b></div><div class="stat" title="The loudest you got on this breach."><span>Trace peak</span><b>${c.trace}</b></div><div class="stat"><span>Vaults</span><b>${c.vaults}</b></div></div>
      ${reportMarkup(b)}
      ${loot ? `<ul class="cap-loot">${loot}</ul>` : ''}
      ${dump}
      ${again}</section>`;
  }
  if (b.result === 'lost') {
    const L = b.lost || { items: [] };
    return `<section class="card bx-capture lost"><div class="cap-kick"><span>SIGNAL LOST</span><span>${esc(card.name)}</span></div><h1>Disconnected</h1><p class="svc-line">${esc(L.why || '')}</p>
      <ul class="cap-lines"><li><span class="cap-sub">lost</span><b>${L.items.length} unbanked</b><span>${esc(L.items.join(', ') || 'nothing in the pack')}</span></li><li><span class="cap-sub">kept</span><b>+${b.xp.toLocaleString('en-US')} XP</b><span>${b.banked.length} banked ${b.banked.length === 1 ? 'item' : 'items'}, and your scripts. The server stays uncaptured.</span></li></ul>${reportMarkup(b)}${again}</section>`;
  }
  return `<section class="card bx-capture"><div class="cap-kick"><span>JACKED OUT</span><span>${esc(card.name)}</span></div><h1>Out with the pack</h1><p class="svc-line">${b.banked.length} ${b.banked.length === 1 ? 'item' : 'items'} banked, +${b.xp.toLocaleString('en-US')} XP. The server stays uncaptured.</p>${reportMarkup(b)}${again}</section>`;
}

// ---------- the run: one strip ----------
// A piece of gear: its name (the item card on hover) and stats, and Equip, or a tag when it's already on.
function itemRow(s, it) {
  const on = Object.values(s.gear?.rigs || {}).flat().includes(it.id), can = !on && !s.breach.result;
  return `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><small>${esc(statLine(it.stats))}</small>${on ? '<span class="tag you">on</span>' : can ? btn('equip', 'Equip', { arg: it.id }) : ''}</li>`;
}
// Trace on the strip: a meter with its two marks (the alarm, the hunter), and what moves it on hover.
export function traceStat(s) {
  const b = s.breach, t = b.trace || 0, lvl = t >= TRACE.hunt ? 'hunt' : t >= TRACE.alarm ? 'alarm' : 'ok';
  const tip = `Trace ${t}: how loud you've been. Elites, opening vaults, bait and honeytokens raise it; a quiet step, a rest and a switch's ICE lower it.${cardOf(s).kind === 'Mailhub' ? ` At ${TRACE.alarm} the mail daemon floods every fight with spam.` : ` At ${TRACE.alarm} the alarm is up.`} At ${TRACE.hunt} a hunter ICE drops onto the map and closes a node every move you make; under ${TRACE.lose} it loses you.${classOf(s) === 'infiltrator' ? ' As an Infiltrator, it rises half as fast.' : ''}`;
  return `<span class="bx-trace ${lvl}" title="${esc(tip)}"><span class="lbl">Trace</span><span class="tbar"><span style="width:${t}%"></span><i style="left:${TRACE.alarm}%"></i><i style="left:${TRACE.hunt}%"></i></span><b>${t}</b>${b.hunter ? '<small class="bx-hunted">HUNTED</small>' : ''}</span>`;
}
function hudMarkup(s) {
  const b = s.breach, sig = signalOf(s), max = maxOf(s), pct = max ? (sig / max) * 100 : 0;
  const lvl = pct <= 30 ? 'low' : pct <= 60 ? 'mid' : 'ok';
  const pack = b.pack.map((id) => stashItem(s, id)).filter(Boolean);
  const banked = b.banked.map((id) => stashItem(s, id)).filter(Boolean);
  const here = currentNode(s), lastAct = (here?.act ?? 0) >= (b.map.acts || ACTS.length) - 1 || here?.kind === 'boss', card = cardOf(s);
  const where = lastAct ? 'banks on capture' : 'banks at the gate';
  const fresh = pack.some((it) => !bxUi.seen.has(it.id));
  const bag = scriptsOf(s), K = KINDS[card.kind];
  const scripts = bag.map((id) => `<li class="bx-perk script r-${TIER[SCRIPTS[id].rarity]}" title="${esc(`${scriptTip(id)} Run it in a fight: one a fight, and it takes no cycle.`)}">${esc(SCRIPTS[id].name)}</li>`).join('');
  const packBtn = pack.length || banked.length
    ? `<button type="button" class="bx-stat bx-packbtn${fresh ? ' new' : ''}${bxUi.pack ? ' on' : ''}" data-bx-ui="pack" aria-expanded="${bxUi.pack}" title="${esc(`Pack: gear you picked up on this breach. It ${lastAct ? 'banks when you capture the server' : 'banks at the next gate'}. If your Signal hits 0 first, it is lost.`)}"><span class="lbl">${pack.length ? 'Pack' : 'Banked'}</span><b>${pack.length || banked.length}</b>${pack.length ? `<small>${where}</small>` : ''}<span class="ico" ${icon('chevron')}></span></button>`
    : '';
  const pop = bxUi.pack && packBtn ? `<div class="bx-pop" role="dialog" aria-label="Pack">
      ${pack.length ? `<h3 class="bx-sec">Pack <small>${where}</small></h3><ul class="bx-items">${pack.map((it) => itemRow(s, it)).join('')}</ul>` : ''}
      ${banked.length ? `<h3 class="bx-sec">Banked <small>${banked.length}</small></h3><ul class="bx-items">${banked.map((it) => itemRow(s, it)).join('')}</ul>` : ''}
    </div>` : '';
  const vaults = nodeList(b.map).some((n) => n.kind === 'vault');
  return `<header class="bx-hud" aria-label="Your run">
    <span class="bx-hud-id" title="${esc(`${card.name}: A ${card.author.toUpperCase()} ${card.kind} at level ${b.level}. Its Resident is ${residentName(card)}. You read ${fogOf(s)} rows ahead.`)}"><span class="ico" ${icon('server')}></span><b>${esc(card.name)}</b></span>
    <div class="bx-sig ${lvl}" title="Signal: your health for the whole breach. It carries from fight to fight. Only a defrag or a broker's patch restores it: what heals you in a fight never takes you over the Signal you started it with."><span class="lbl">Signal</span><span class="sigbar"><span style="width:${pct.toFixed(1)}%"></span></span><strong>${sig}</strong><small>/${max}</small></div>
    ${traceStat(s)}
    <span class="bx-stat" title="Tokens: spend them at a broker on scripts and patches. Caches pay them."><span class="lbl">Tokens</span><b>${b.tokens}</b></span>
    ${b.keys || vaults ? `<span class="bx-stat${b.keys ? '' : ' out'}" title="Keycards: each opens one vault on this breach. A virus carrying one shows a key on the map."><span class="lbl">Keys</span><b>${b.keys}</b></span>` : ''}
    ${K ? `<span class="bx-stat bx-kind" title="${esc(`${card.kind}: ${K.text}`)}"><span class="lbl">${esc(card.kind)}</span><b>${esc(K.rule)}</b></span>` : ''}
    ${heatStat(b)}
    ${packBtn ? `<div class="bx-packwrap">${packBtn}${pop}</div>` : ''}
    <ul class="bx-perks" aria-label="Scripts" title="${esc(`Scripts: ${bag.length} of ${slotsOf(s)} slots.`)}"><li class="bx-perk-k lbl">Scripts ${bag.length}/${slotsOf(s)}</li>${scripts}</ul>
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
// The scripts on the fight tray (view.mjs trayMarkup): a button each, `script <n>`, while a breach fight runs.
export function scriptTray(s) {
  const e = s.encounter;
  if (!e?.breach) return '';
  const bag = scriptsOf(s), used = !!e.scriptUsed;
  if (!bag.length) return '';
  return bag.map((id, i) => { const x = SCRIPTS[id]; return `<button type="button" class="ability script r-${TIER[x.rarity]}${used ? ' cooling' : ' ready'}" data-command="script ${i + 1}"${used ? ' disabled' : ''} title="${esc(`${scriptTip(id)} Usable once per fight. Takes no cycle.${x.target === 'part' ? ' Aims at the part you select, or the one attacking soonest.' : ''}`)}"><span class="ico" style="--icon:url('ui/icons/command.svg')"></span><span class="name"><kbd>S${i + 1}</kbd>${esc(x.name)}</span><span class="state">${used ? 'one a fight' : 'script'}</span><span class="charge" style="width:${used ? 0 : 100}%"></span></button>`; }).join('');
}

// The quest window, three directions to pick from (docs/threads.md 7). A thread's dialogue over the map (threadPanel:
// the thread arriving, a step's talk, its last lines), its page in Mail (threadReader) and its reward card
// (offerMarkup), each drawn one of three ways:
//   a  transmission  a message that arrives: its sender with their mark, its first line resolving out of noise, the
//                    steps printed as a job (the ones ahead still encrypted); the end a signed receipt
//   b  case file     a file in a folder: its tab, a stamp for where it stands, an ASCII face for who's in it, the steps
//                    ahead redacted until the thread gets you there
//   c  job ticket    a compact ticket: its number and state, the steps as [ ] lines that tick to [x], a reward block
// Switched by ?quest=a|b|c (this page only), the System page's Quest window or `quest a|b|c|current` (kept on the
// save); current (threads-view.mjs's own look) is the default until one is picked. `developer thread preview` shows
// one thread offered, under way, at its turn-in and its reward, in whichever is on (previewOf, previewMarkup).
// Amber throughout (a thread's colour); teal is only ever you. Nothing moves once it has arrived: the one-time
// arrival (the decrypt, a redaction lifting, a stamp) resumes where it was on a re-render (ageOf) and is still with
// Motion off.
import { esc } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { FACTIONS } from './factions.mjs';
import { statLine, itemLabel, SLOTS, RULES } from './gear.mjs';
import { hackerLevel } from './combat.mjs';
import { chainOf, chainDef, stepsOf, objectiveOf, fill, offerItems, CHAINS, TEMPLATES } from './threads.mjs';
import { TH_ICONS, panelCurrent, readerCurrent, rewardCurrent } from './threads-view.mjs';

export const QUEST = {
  styles: ['current', 'a', 'b', 'c'],
  names: { current: 'current', a: 'transmission', b: 'case file', c: 'job ticket' },
  forced: null, // ?quest=a|b|c: this page only, over the setting
  settle: 3200, // ms: the arrival is over by then (a re-render after it draws the window still)
};
export const questStyle = (s) => QUEST.forced || (QUEST.styles.includes(s?.settings?.quest) ? s.settings.quest : 'current');
// quest [a|b|c|current|next]: the setting, and what to say.
export function questCommand(s, arg = '') {
  const a = String(arg).trim().toLowerCase(), cur = questStyle(s);
  const to = a === '' ? null : a === 'next' ? QUEST.styles[(QUEST.styles.indexOf(s.settings?.quest || 'current') + 1) % QUEST.styles.length] : QUEST.styles.find((x) => x === a || QUEST.names[x] === a);
  if (a && !to) return `quest: ${QUEST.styles.join(', ')}.`;
  if (!to) return `Quest window: ${QUEST.names[cur]}.`;
  s.settings ||= {};
  s.settings.quest = to;
  return `Quest window: ${QUEST.names[to]}.${QUEST.forced && QUEST.forced !== to ? ` This page keeps ?quest=${QUEST.forced}.` : ''}`;
}

// ---------- the model ----------
// One shape for a live thread (modelOf) and the preview's (previewOf): its number, title, who it's for and why, its
// steps (done, the one you're on with its progress, the ones ahead and how long their line is), where it stands.
const pad4 = (n) => String(n).padStart(4, '0');
const mix = (a, b) => (Math.imul((a >>> 0) ^ Math.imul(b + 0x9e37, 2654435761), 2246822519) >>> 0) || 1;
// A thread's signature: two groups of four from its seed (presentation only).
export const sigOf = (seed) => { const h = mix(seed >>> 0, 77).toString(16).toUpperCase().padStart(8, '0'); return `${h.slice(0, 4)}·${h.slice(4)}`; };
export function modelOf(s, t) {
  const c = chainOf(t), T = s.threads || {};
  const steps = stepsOf(s, t).map((x) => ({ ...x, fog: x.text === '???', text: x.now ? objectiveOf(s, t) : x.text, len: x.text === '???' ? fill(s, t, c.steps[x.i].text).length : 0 }));
  return { id: t.id, num: Number(String(t.id).slice(1)) || 0, title: c?.title || t.chain, giver: c?.giver || '', reason: c?.reason || '', faction: c?.faction || null, short: !!c?.short,
    state: t.state, tracked: T.track === t.id, lore: t.lore || c?.lore || '', took: t.reward || null, waiting: T.offer?.tid === t.id, steps, sig: sigOf(t.seed || 1), icon: c?.steps?.[0]?.icon || 'npc' };
}
// The moment a dialogue is: the thread arriving (its opening), a step's talk, its last lines (the turn-in), a log.
export function momentOf(d, m) {
  if (!d || d.kind === 'log' || d.kind === 'sweep') return 'log';
  if (d.at === 0) return 'open';
  if (m && d.at != null && d.at === m.steps.length - 1) return 'close';
  return 'mid';
}
// How long ago this dialogue first drew (ms): the arrival resumes there on a re-render instead of starting over.
export function ageOf(ui, n, now = Date.now()) {
  if (ui.qn !== n) { ui.qn = n; ui.qt = now; }
  return Math.max(0, now - ui.qt);
}

// ---------- shared pieces ----------
const lineCls = (l) => (/^>/.test(l) ? ' sys' : /^"/.test(l) ? ' quote' : '');
const icon = (name) => `<svg class="q-ic" viewBox="0 0 24 24" aria-hidden="true">${TH_ICONS[name] || TH_ICONS.npc}</svg>`;
// Who it's from: their faction's mark where a faction is in the thread, else what they are (a terminal, a file, a log).
const mark = (m, ic) => {
  const f = m?.faction && FACTIONS[m.faction];
  return f ? `<span class="q-mark q-f" style="--fc:${f.color}" title="${esc(f.name)}">${glyph('f-' + m.faction)}</span>` : `<span class="q-mark">${icon(ic)}</span>`;
};
const xBtn = '<button type="button" class="btn small pz-x" data-th-close title="Close (Esc)" aria-label="Close">×</button>';
const closeRow = '<div class="row acts th-acts"><button type="button" class="btn" data-th-close>Close</button></div>';
const choicesOf = (d) => (d.choices ? `<div class="th-choices">${d.choices.map((c, i) => `<button type="button" class="btn th-choice" data-rooms="talk" data-arg="${i + 1}"><kbd>${i + 1}</kbd><span>${esc(c)}</span></button>`).join('')}</div>` : '');
const later = '<button type="button" class="sp-go th-later" data-th-later>Later <small>it waits in Mail</small></button>';
const tookLine = (m) => (m.took ? `<p class="svc-line"><span class="tag dim">took</span> ${esc(m.took)}</p>` : '');
const where = (ctx) => `${esc(ctx.addr || '')}${ctx.server ? `${ctx.addr ? ' · ' : ''}${esc(ctx.server)}` : ''}`;
const bits = (it, i) => ({ n: i + 1, name: itemLabel(it), slot: SLOTS[it.group]?.name || it.group, level: it.level, mine: i === 0, rarity: it.rarity,
  stats: Object.keys(it.stats || {}).map((k) => statLine({ [k]: it.stats[k] })).filter(Boolean), rule: it.rule && RULES[it.rule] ? RULES[it.rule].name : null });
const itemSub = (b) => `${esc(b.slot)} · lv ${b.level}${b.mine ? ' · <i>for you</i>' : ''}`;
// Static noise the length of a line (its spaces kept, so it wraps as the line does): what a line was before it resolved.
const NOISE = '0123456789abcdef#%&*+=/<>';
export function noise(text, seed = 7) {
  let h = seed >>> 0 || 7;
  return [...String(text)].map((ch) => (ch === ' ' ? ' ' : ((h = mix(h, ch.charCodeAt(0))), NOISE[h % NOISE.length]))).join('');
}
// A step still ahead, encrypted: hex in pairs, about as long as its line.
export function cipher(len, seed = 7) {
  let h = seed >>> 0 || 7, out = '';
  for (let i = 0; i < Math.ceil(len / 3); i++) { h = mix(h, i); out += (i ? ' ' : '') + (h & 0xff).toString(16).padStart(2, '0'); }
  return out;
}
const wrap = (style, d, age, inner, card) => `<div class="pz-panel th-panel q-panel q-${style} k-${esc(d.kind)}${age > QUEST.settle ? ' q-settled' : ''}" id="th-panel" data-th-n="${d.n}" role="dialog" aria-label="${esc(d.who)}" style="--age:${Math.min(age, QUEST.settle + 1)}ms">
    <section class="pz-card th-card q-card ${card}">${inner}</section></div>`;

// ---------- a: transmission ----------
function jobA(m, i0 = 0) {
  const rows = m.steps.map((x, k) => `<li class="${x.done ? 'done' : x.now ? 'now' : 'fog'}"><span class="qa-n">${String(k + 1).padStart(2, '0')}</span><span class="qa-st" aria-hidden="true">${x.done ? '✓' : x.now ? '▸' : '·'}</span>${x.fog
    ? `<span class="qa-t qa-enc" role="img" aria-label="Not yet" title="Not yet: the thread tells you when you get there.">${esc(cipher(Math.min(36, Math.max(12, x.len)), m.num * 131 + k))}</span>`
    : `<span class="qa-t">${esc(x.text)}</span>`}</li>`).join('');
  return `<div class="qa-job" style="--i:${i0}"><p class="qa-job-h"><span>job ${pad4(m.num)}</span><span>${m.steps.filter((x) => x.done).length}/${m.steps.length}</span></p><ol class="qa-steps">${rows}</ol></div>`;
}
const signA = (who, sig, i = 0) => `<p class="qa-sign" style="--i:${i}"><span>signed</span><b>${esc(who)}</b><code>${esc(sig)}</code></p>`;
function panelA(d, m, ctx, moment) {
  const kick = { open: 'Incoming', mid: 'Channel open', close: 'Last transmission', log: 'Log' }[moment];
  const lines = d.lines.map((l, i) => (i === 0 && moment !== 'log'
    ? `<p class="qa-line qa-dec${lineCls(l)}" style="--i:0"><span class="qa-noise" aria-hidden="true">${esc(noise(l, (m?.num || 1) * 7919 + d.n))}</span><span class="qa-txt">${esc(l)}</span></p>`
    : `<p class="qa-line${lineCls(l)}" style="--i:${i}">${esc(l)}</p>`)).join('');
  const n = d.lines.length;
  return `<header class="pz-head qa-head"><p class="pz-kick">${kick} · <span class="pz-at">${where(ctx)}</span></p><h1>${mark(m, d.icon)}<span>${esc(d.who)}</span></h1>${d.title ? `<p class="qa-thread">${esc(d.title)}</p>` : ''}${xBtn}</header>
      ${ctx.body || `<div class="qa-lines">${lines}${moment === 'close' && m && !d.choices ? signA(d.who, m.sig, n) : ''}</div>`}${moment === 'open' && m ? jobA(m, n) : ''}${choicesOf(d) || closeRow}`;
}
function readerA(m, acts) {
  return `<section class="card mread th-read q-a"><h2 class="qa-from">${mark(m, m.icon)}<span>${esc(m.giver)}</span>${m.short ? '' : '<small>· chain</small>'}</h2><h1>${esc(m.title)}</h1>
    <p class="qa-reason">${esc(m.reason)}</p>${jobA(m)}
    ${m.state === 'done' ? `<p class="th-lore">${esc(m.lore)}</p>${signA(m.giver, m.sig)}${tookLine(m)}` : m.state === 'abandoned' ? '<p class="qa-state">Set aside</p>' : ''}
    ${acts ? `<div class="row acts">${acts}</div>` : ''}</section>`;
}
function rewardA(m, items) {
  const rows = items.map((it, i) => { const b = bits(it, i); return `<button type="button" class="qa-item r-${b.rarity}" data-run="thread take ${b.n}" title="Take it"><span class="qa-n">${b.n}</span><span class="qa-iw"><b class="iname r-${b.rarity}">${esc(b.name)}</b><small>${itemSub(b)}</small></span><span class="qa-is">${b.stats.map((x) => `<span>${esc(x)}</span>`).join('')}${b.rule ? `<em>${esc(b.rule)}</em>` : ''}</span><span class="qa-take">Take</span></button>`; }).join('');
  return `<div class="sp-card th-offer-card q-a qa-receipt" role="dialog" aria-label="${esc(`${m.title}: pick one`)}">
    <header class="qa-rhead"><span class="sp-kicker">Receipt</span><strong class="sp-name">${esc(m.title)}</strong><span class="qa-rno">job ${pad4(m.num)}</span></header>
    <ol class="qa-steps">${m.steps.map((x, k) => `<li class="done"><span class="qa-n">${String(k + 1).padStart(2, '0')}</span><span class="qa-st" aria-hidden="true">✓</span><span class="qa-t">${esc(x.text)}</span></li>`).join('')}</ol>
    <p class="th-lore">${esc(m.lore)}</p>${signA(m.giver, m.sig)}
    <p class="th-pick">Pick one</p><div class="qa-items">${rows}</div>${later}</div>`;
}

// ---------- b: case file ----------
// The face in the file: what's waiting there, in ASCII (a terminal, a file, a log).
export const FACE = {
  npc: [".------.", "| >_   |", "|      |", "'------'", "  _||_  "],
  file: [".----.  ", "|    '. ", "| ---- |", "| ---- |", "'------'"],
  log: [".------.", "| == - |", "| ==== |", "| = -- |", "'------'"],
};
const stampB = (text, cls) => `<span class="qb-stamp s-${cls}">${esc(text)}</span>`;
const stateStamp = (m) => (m.state === 'done' ? stampB('Closed', 'closed') : m.state === 'abandoned' ? stampB('Set aside', 'aside') : stampB('Open', 'open'));
function idB(ic, rows) {
  return `<div class="qb-id"><pre class="qb-face" aria-hidden="true">${(FACE[ic] || FACE.npc).map(esc).join('\n')}</pre><dl class="qb-fields">${rows.filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}
function stepsB(m) {
  return `<ol class="qb-steps">${m.steps.map((x) => (x.fog
    ? `<li class="fog"><span class="qb-bar" style="--w:${Math.min(44, Math.max(8, x.len))}ch" role="img" aria-label="Redacted" title="Redacted until the thread gets you there."></span></li>`
    : `<li class="${x.done ? 'done' : 'now'}"><span class="qb-t">${esc(x.text)}</span></li>`)).join('')}</ol>`;
}
function panelB(d, m, ctx, moment) {
  const stamp = moment === 'open' ? stampB('Open', 'open') : moment === 'close' && m?.state === 'done' && !d.choices ? stampB('Closed', 'closed') : '';
  const lines = d.lines.map((l, i) => `<p class="qb-line${lineCls(l)}" style="--i:${i}">${esc(l)}</p>`).join('');
  return `<header class="qb-tabs"><span class="qb-tab">${esc(d.title || d.who)}</span>${xBtn}</header>
      <div class="qb-sheet">${stamp}${idB(d.icon, [['Subject', `${mark(m, d.icon)}${esc(d.who)}`], ['Found', where(ctx)]])}
        ${ctx.body || `<div class="qb-transcript">${lines}</div>`}${moment === 'open' && m ? stepsB(m) : ''}
        ${choicesOf(d) || closeRow}</div>`;
}
function readerB(m, acts) {
  return `<section class="card mread th-read q-b"><div class="qb-tabs"><h1 class="qb-tab">${esc(m.title)}</h1>${m.short ? '' : '<span class="qb-kind">chain</span>'}</div>
    <div class="qb-sheet">${stateStamp(m)}${idB(m.icon, [['Subject', `${mark(m, m.icon)}${esc(m.giver)}`], ['Reason', esc(m.reason)]])}
      ${stepsB(m)}${m.state === 'done' ? `<p class="th-lore">${esc(m.lore)}</p>${tookLine(m)}` : ''}
      ${acts ? `<div class="row acts">${acts}</div>` : ''}</div></section>`;
}
function rewardB(m, items) {
  const cards = items.map((it, i) => { const b = bits(it, i); return `<button type="button" class="th-item qb-item r-${b.rarity}" data-run="thread take ${b.n}" title="Take it"><span class="th-n">${b.n}</span><b class="iname r-${b.rarity}">${esc(b.name)}</b><small>${itemSub(b)}</small><span class="th-stats">${b.stats.map((x) => `<span>${esc(x)}</span>`).join('')}</span>${b.rule ? `<span class="th-rule">${esc(b.rule)}</span>` : ''}<span class="th-take">Take</span></button>`; }).join('');
  return `<div class="sp-card th-offer-card q-b qb-reward" role="dialog" aria-label="${esc(`${m.title}: pick one`)}">
    <div class="qb-tabs"><span class="qb-tab">${esc(m.title)}</span></div>
    <div class="qb-sheet">${stampB('Closed', 'closed')}${idB(m.icon, [['Subject', `${mark(m, m.icon)}${esc(m.giver)}`]])}
      <p class="th-lore">${esc(m.lore)}</p><p class="th-pick">Pick one</p><div class="th-items">${cards}</div>${later}</div></div>`;
}

// ---------- c: job ticket ----------
const stateWordC = (m, moment) => (m?.state === 'done' ? 'resolved' : m?.state === 'abandoned' ? 'set aside' : moment === 'open' ? 'new' : m?.tracked ? 'tracked' : 'open');
// tick: the step that has just been done (the opening's, the last), its [x] lit as it arrives.
function asksC(m, tick = -1) {
  return `<ul class="qc-asks">${m.steps.map((x, k) => `<li class="${x.done ? 'done' : x.now ? 'now' : 'fog'}${k === tick ? ' ticked' : ''}"><span class="qc-box" aria-hidden="true">${x.done ? '[x]' : '[ ]'}</span><span>${esc(x.fog ? '???' : x.text)}</span></li>`).join('')}</ul>`;
}
function rewardBlockC(m) {
  const tip = m.short ? 'Three items at the end, pick one: blue half the time, else white. Deed XP for each step after the first.' : 'Three items at the end, pick one: blues, a yellow one time in ten. Deed XP for each step after the first.';
  const f = m.faction && FACTIONS[m.faction];
  return `<div class="qc-reward"><span class="qc-k">Reward</span><span class="qc-rv" title="${esc(tip)}">pick 1 of 3 ${(m.short ? ['tuned', 'stock'] : ['tuned']).map((r) => `<i class="qc-r r-${r}"></i>`).join('')}</span>${f ? `<span class="qc-rv" title="${esc(`Standing with ${f.name}, by how it ends.`)}">${mark(m)}standing</span>` : ''}</div>`;
}
const headC = (m, title, word) => `<header class="qc-head"><span class="qc-no">${m ? `#${pad4(m.num)}` : '#'}</span><b class="qc-title">${esc(title)}</b><span class="qc-state s-${word.replace(' ', '-')}">${esc(word)}</span>`;
function panelC(d, m, ctx, moment) {
  const lines = d.lines.map((l, i) => `<p class="qc-line${lineCls(l)}" style="--i:${i}">${esc(l)}</p>`).join('');
  return `${headC(m, d.title || d.who, stateWordC(m, moment))}${xBtn}</header>
      <p class="qc-from"><span class="qc-k">From</span>${mark(m, d.icon)}<b>${esc(d.who)}</b><span class="qc-at">${where(ctx)}</span></p>
      ${ctx.body || `<div class="qc-msg">${lines}</div>`}${(moment === 'open' || moment === 'close') && m ? asksC(m, moment === 'open' ? 0 : m.state === 'done' ? m.steps.length - 1 : -1) : ''}${moment === 'open' && m ? rewardBlockC(m) : ''}
      ${choicesOf(d) || closeRow}`;
}
function readerC(m, acts) {
  return `<section class="card mread th-read q-c qc-ticket">${headC(m, m.title, stateWordC(m, 'mid'))}</header>
    <p class="qc-from"><span class="qc-k">From</span>${mark(m, m.icon)}<b>${esc(m.giver)}</b>${m.short ? '' : '<span class="qc-at">chain</span>'}</p>
    <p class="qc-desc">${esc(m.reason)}</p>${asksC(m)}
    ${m.state === 'done' ? `<p class="th-lore">${esc(m.lore)}</p>${tookLine(m)}` : rewardBlockC(m)}
    ${acts ? `<div class="row acts">${acts}</div>` : ''}</section>`;
}
function rewardC(m, items) {
  const rows = items.map((it, i) => { const b = bits(it, i); return `<button type="button" class="qc-item r-${b.rarity}" data-run="thread take ${b.n}" title="Take it"><span class="qc-n">${b.n}</span><span class="qc-iw"><b class="iname r-${b.rarity}">${esc(b.name)}</b><small>${itemSub(b)}</small></span><span class="qc-is">${[...b.stats, ...(b.rule ? [b.rule] : [])].map((x) => `<span>${esc(x)}</span>`).join(' · ')}</span><span class="qc-take">Take</span></button>`; }).join('');
  return `<div class="sp-card th-offer-card q-c qc-ticket qc-done" role="dialog" aria-label="${esc(`${m.title}: pick one`)}">
    ${headC(m, m.title, 'resolved')}</header>${asksC(m, m.steps.length - 1)}<p class="th-lore">${esc(m.lore)}</p>
    <div class="qc-reward"><span class="qc-k">Reward</span><span class="qc-rv">pick one</span></div><div class="qc-items">${rows}</div>${later}</div>`;
}

// ---------- the three, by name ----------
const PANEL = { a: [panelA, 'qa-card'], b: [panelB, 'qb-file'], c: [panelC, 'qc-ticket'] };
// d: what was said (threads.mjs T.said); m: its thread's model (null for a log with none); ctx: { addr, server, body
// (the process log's sweep, drawn by view.mjs), age }.
export function panelQ(style, d, m, ctx = {}) {
  const [fn, card] = PANEL[style] || PANEL.a;
  return wrap(style, d, ctx.age || 0, fn(d, m, ctx, momentOf(d, m)), card);
}
export const readerQ = (style, m, acts = '') => ({ a: readerA, b: readerB, c: readerC }[style] || readerA)(m, acts);
export const rewardQ = (style, m, items) => ({ a: rewardA, b: rewardB, c: rewardC }[style] || rewardA)(m, items);

// ---------- developer thread preview ----------
// One thread offered (its opening over the map), under way (its page in Mail, mid-escort or mid-logs), at its turn-in
// (its last lines, with their choice) and its reward (pick one of three), from its content: the places named after
// servers of yours (or stand-ins), the reward rolled as the real one is. Nothing in the save changes.
export const PREVIEW = { stages: [['offer', 'Offered'], ['progress', 'Under way'], ['turnin', 'Turn-in'], ['reward', 'Reward']], chains: ['night-operator', 'restore-point', 'mirror', 'escort', 'talk', 'temp'] };
const STAND_IN = ['ORIN-CACHE-57', 'KESSLER-MIRROR-50', 'VANTA-SINK-36', 'MOTHWELL-SPUR-43'];
const ADDR = ['E4', 'C2', 'F3', 'B5', 'D6'];
const chainId = (k) => (CHAINS[k] ? k : TEMPLATES[k] ? `tpl:${k}:0` : null);
export function previewOf(s, chain = 'night-operator', stage = 'offer') {
  const id = chainId(chain) || 'night-operator', c = chainDef(id);
  if (!c) return null;
  const names = [...new Set([...(s.locations || []).filter((l) => !l.rogue && l.slot && l.name).map((l) => l.name), ...STAND_IN])];
  const keys = Object.keys(c.places || {});
  const pfill = (str) => String(str || '').replace(/\{(\w+)(?:\.(\w+))?\}/g, (m0, k, f) => {
    if (c.temps?.[k]) return f === 'rooms' ? '9' : `${c.temps[k].name || 'SITE'}-17`;
    if (k === 'builder') return Object.values(c.temps || {})[0]?.builder || '?';
    const i = keys.indexOf(k);
    return i < 0 ? '?' : f === 'at' ? ADDR[(i + 1) % ADDR.length] : names[(i + 1) % names.length];
  });
  const n = c.steps.length, mid = Math.max(1, c.steps.findIndex((x, i) => i > 0 && (x.kind === 'escort' || x.kind === 'temp')));
  const step = stage === 'offer' ? 1 : stage === 'progress' ? mid : stage === 'turnin' ? n - 1 : n, done = stage === 'reward';
  const steps = c.steps.map((st, i) => {
    let text = pfill(st.text);
    if (i === step && !done && st.kind === 'escort') text += ` ${st.name}: 72%.`;
    if (i === step && !done && st.kind === 'temp' && st.goal === 'logs') text += ' 1/2.';
    return { i, kind: st.kind, done: done || i < step, now: !done && i === step, fog: !done && i > step, text: !done && i > step ? '???' : text, len: pfill(st.text).length };
  });
  const last = c.steps[n - 1], first = c.steps[0];
  const lore = pfill(c.lore || '');
  const m = { id: 't3', num: 3, title: c.title, giver: c.giver || '', reason: c.reason || '', faction: c.faction || null, short: !!c.short, state: done ? 'done' : 'active', tracked: true,
    lore, took: null, waiting: done, steps, sig: sigOf(4471), icon: first?.icon || 'npc' };
  let said = null;
  if (stage === 'offer') said = { n: 1, who: first.who, icon: first.icon, lines: first.lines.map(pfill), choices: null, kind: 'talk', title: c.title, at: 0 };
  if (stage === 'turnin' && last.kind === 'talk') said = { n: 2, who: last.who, icon: last.icon, lines: last.lines.map(pfill), choices: last.choice ? last.choice.map((x) => x.label) : null, kind: 'talk', title: c.title, at: n - 1 };
  const items = offerItems(s, { seed: 4471, chain: id, level: hackerLevel(s), places: {} });
  return { id, chain: CHAINS[chain] || TEMPLATES[chain] ? chain : 'night-operator', c, m, said, items, ctx: { addr: ADDR[0], server: names[0] }, stage };
}
// The preview's buttons do nothing in the game: every command, move and close comes off them.
const inert = (html) => html.replace(/ data-(?:run|rooms|arg|go|command)="[^"]*"| data-th-(?:close|later|offer)(?=[\s>])| id="th-panel"/g, '');
export function previewMarkup(s, ui = {}) {
  const stage = PREVIEW.stages.some(([k]) => k === ui.stage) ? ui.stage : 'offer';
  const p = previewOf(s, ui.chain, stage);
  if (!p) return '';
  const style = questStyle(s), m = p.m;
  const acts = '<button type="button" class="btn">Untrack</button><button type="button" class="btn">On map</button><button type="button" class="btn small">Set aside</button>';
  let body = '';
  if (stage === 'offer' || stage === 'turnin') {
    body = !p.said ? `<p class="quiet thp-none">${esc(p.c.title)} ends at a kill switch: no last lines, only the reward.</p>`
      : `<div class="thp-map">${style === 'current' ? panelCurrent(p.said, `${p.ctx.addr}`) : panelQ(style, p.said, m, { ...p.ctx, age: ageOf(ui, `${stage}:${style}:${p.chain}`) })}</div>`;
  } else if (stage === 'progress') body = `<div class="thp-mail">${style === 'current' ? readerCurrent(m, acts) : readerQ(style, m, acts)}</div>`;
  else body = `<div class="thp-gain">${style === 'current' ? rewardCurrent(m.title, m.lore, p.items) : rewardQ(style, m, p.items)}</div>`;
  const tab = (attr, k, label, on) => `<button type="button" role="tab" ${attr}="${k}" aria-selected="${on}">${esc(label)}</button>`;
  return `<div class="thp" role="dialog" aria-label="Quest window preview">
    <header class="thp-bar"><span class="thp-k">Quest window</span>
      <nav class="ltabs thp-tabs" role="tablist" aria-label="Stage">${PREVIEW.stages.map(([k, l]) => tab('data-thp-stage', k, l, k === stage)).join('')}</nav>
      <nav class="ltabs thp-tabs" role="tablist" aria-label="Direction">${QUEST.styles.map((k) => tab('data-thp-style', k, k === 'current' ? 'Current' : `${k.toUpperCase()} · ${QUEST.names[k]}`, k === style)).join('')}</nav>
      <button type="button" class="btn small" data-thp-chain title="Another thread">${esc(p.c.title)} ›</button>
      <button type="button" class="btn small thp-x" data-thp-close title="Close (Esc)" aria-label="Close">×</button></header>
    <div class="thp-body s-${stage}">${inert(body)}</div></div>`;
}

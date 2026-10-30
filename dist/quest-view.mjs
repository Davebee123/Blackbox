// The quest window (docs/threads.md 7): a thread as an intercepted transmission. Its dialogue over the map
// (threadPanel: the thread arriving, a step's talk, its last lines), its page in Mail (threadReader) and its reward card
// (offerMarkup). A thread arrives as a message: Incoming, its sender with their faction's mark (or what they are), its
// first line resolving out of noise once, the steps printed as a job (✓ done, ▸ the one you're on, the ones ahead still
// encrypted, dim); its last lines are signed, and the reward card is a signed receipt (the steps, the lore, pick one).
// `developer thread preview` shows one thread offered, under way, at its turn-in and its reward (previewOf,
// previewMarkup). Amber throughout (a thread's colour); teal is only ever you. Calm: the decrypt plays once, for a new
// quest's opening only, and never again (a re-render while it plays carries it on where it was: ageOf; after that, and
// with Motion off or reduced motion, it is drawn still).
import { esc } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { FACTIONS } from './factions.mjs';
import { statLine, itemLabel, SLOTS, RULES } from './gear.mjs';
import { hackerLevel } from './combat.mjs';
import { chainOf, chainDef, stepsOf, objectiveOf, fill, offerItems, CHAINS, TEMPLATES } from './threads.mjs';
import { TH_ICONS } from './threads-view.mjs';
import { portraitMarkup } from './portraits.mjs';

export const QUEST = { settle: 2400 }; // ms: a dialogue's arrival is over by then; drawn still after

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
// The moment a dialogue is: the thread arriving (its opening, said once: threads.mjs begin), a step's talk, its last
// lines (the turn-in), a log.
export function momentOf(d, m) {
  if (!d || d.kind === 'log' || d.kind === 'sweep') return 'log';
  if (d.at === 0) return 'open';
  if (m && d.at != null && d.at === m.steps.length - 1) return 'close';
  return 'mid';
}
// How long ago this dialogue first drew (ms): a re-render during the arrival carries it on from there, never over.
export function ageOf(ui, n, now = Date.now()) {
  if (ui.qn !== n) { ui.qn = n; ui.qt = now; }
  return Math.max(0, now - ui.qt);
}

// ---------- pieces ----------
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
// Static noise the length of a line (its spaces kept, so it wraps as the line does): what the opening line was before
// it resolved.
const NOISE = '0123456789abcdef#%&*+=/<>';
export function noise(text, seed = 7) {
  let h = seed >>> 0 || 7;
  return [...String(text)].map((ch) => (ch === ' ' ? ' ' : ((h = mix(h, ch.charCodeAt(0))), NOISE[h % NOISE.length]))).join('');
}
// A step still ahead, encrypted: hex in pairs, about as long as its line (drawn dim and still).
export function cipher(len, seed = 7) {
  let h = seed >>> 0 || 7, out = '';
  for (let i = 0; i < Math.ceil(len / 3); i++) { h = mix(h, i); out += (i ? ' ' : '') + (h & 0xff).toString(16).padStart(2, '0'); }
  return out;
}

// ---------- the job: a thread's steps, printed ----------
function job(m, i0 = 0) {
  const rows = m.steps.map((x, k) => `<li class="${x.done ? 'done' : x.now ? 'now' : 'fog'}"><span class="qa-n">${String(k + 1).padStart(2, '0')}</span><span class="qa-st" aria-hidden="true">${x.done ? '✓' : x.now ? '▸' : '·'}</span>${x.fog
    ? `<span class="qa-t qa-enc" role="img" aria-label="Not yet" title="${esc(m.fogTip || 'Not yet: the thread tells you when you get there.')}">${esc(cipher(Math.min(36, Math.max(12, x.len)), m.num * 131 + k))}</span>`
    : `<span class="qa-t">${esc(x.text)}</span>`}</li>`).join('');
  return `<div class="qa-job" style="--i:${i0}"><p class="qa-job-h"><span>${esc(m.jobLabel || `job ${pad4(m.num)}`)}</span><span>${m.steps.filter((x) => x.done).length}/${m.steps.length}</span></p><ol class="qa-steps">${rows}</ol></div>`;
}
const sign = (who, sig, i = 0) => `<p class="qa-sign" style="--i:${i}"><span>signed</span><b>${esc(who)}</b><code>${esc(sig)}</code></p>`;

// ---------- the dialogue over the map ----------
// Who's talking stands beside their lines (portraits.mjs), scanning in a row at a time with the lines, once.
// d: what was said (threads.mjs T.said); m: its thread's model (null for a log with none); ctx: { addr, server, body
// (the process log's sweep, drawn by view.mjs), age (ms since it first drew) }.
export function questPanel(d, m, ctx = {}) {
  const moment = momentOf(d, m), age = ctx.age || 0, still = age > QUEST.settle;
  const kick = { open: 'Incoming', mid: 'Channel open', close: 'Last transmission', log: 'Log' }[moment];
  const lines = d.lines.map((l, i) => (i === 0 && moment === 'open'
    ? `<p class="qa-line qa-dec${lineCls(l)}" style="--i:0"><span class="qa-noise" aria-hidden="true">${esc(noise(l, (m?.num || 1) * 7919 + d.n))}</span><span class="qa-txt">${esc(l)}</span></p>`
    : `<p class="qa-line${lineCls(l)}" style="--i:${i}">${esc(l)}</p>`)).join('');
  const n = d.lines.length;
  return `<div class="pz-panel th-panel q-panel k-${esc(d.kind)} m-${moment}${still ? ' q-settled' : ''}" id="th-panel" data-th-n="${d.n}" role="dialog" aria-label="${esc(d.who)}"${still ? '' : ` style="--age:${age}ms"`}>
    <section class="pz-card th-card q-card"><header class="pz-head qa-head"><p class="pz-kick">${kick} · <span class="pz-at">${where(ctx)}</span></p><h1>${mark(m, d.icon)}<span>${esc(d.who)}</span></h1>${d.title ? `<p class="qa-thread">${esc(d.title)}</p>` : ''}${xBtn}</header>
      ${ctx.body || `<div class="q-talk">${portraitMarkup(d.who, d.icon)}<div class="qa-lines">${lines}${moment === 'close' && m && !d.choices ? sign(d.who, m.sig, n) : ''}</div></div>`}${moment === 'open' && m ? job(m, n) : ''}${choicesOf(d) || closeRow}</section></div>`;
}

// ---------- its page in Mail ----------
// extra: what follows the job (a floor job's letter and its contract: arcs-view.mjs); m.tag: the line by the giver.
export function questReader(m, acts = '', extra = '') {
  return `<section class="card mread th-read q-read"><h2 class="qa-from">${mark(m, m.icon)}<span>${esc(m.giver)}</span>${m.tag != null ? `<small>· ${esc(m.tag)}</small>` : m.short ? '' : '<small>· chain</small>'}</h2><h1>${esc(m.title)}</h1>
    <p class="qa-reason">${esc(m.reason)}</p>${job(m)}${extra}
    ${m.state === 'done' ? `<p class="th-lore">${esc(m.lore)}</p>${sign(m.giver, m.sig)}${tookLine(m)}` : m.state === 'abandoned' ? '<p class="qa-state">Set aside</p>' : ''}
    ${acts ? `<div class="row acts">${acts}</div>` : ''}</section>`;
}

// ---------- the reward: a signed receipt, pick one of three (WoW's quest reward) ----------
// take: the command that takes item n (a floor job's is mail take: arcs.mjs).
export function questReward(m, items, take = 'thread take') {
  const rows = items.map((it, i) => { const b = bits(it, i); return `<button type="button" class="qa-item r-${b.rarity}" data-run="${esc(take)} ${b.n}" title="Take it"><span class="qa-n">${b.n}</span><span class="qa-iw"><b class="iname r-${b.rarity}">${esc(b.name)}</b><small>${esc(b.slot)} · lv ${b.level}${b.mine ? ' · <i>for you</i>' : ''}</small></span><span class="qa-is">${b.stats.map((x) => `<span>${esc(x)}</span>`).join('')}${b.rule ? `<em>${esc(b.rule)}</em>` : ''}</span><span class="qa-take">Take</span></button>`; }).join('');
  return `<div class="sp-card th-offer-card qa-receipt" role="dialog" aria-label="${esc(`${m.title}: pick one`)}">
    <header class="qa-rhead"><span class="sp-kicker">Receipt</span><strong class="sp-name">${esc(m.title)}</strong><span class="qa-rno">${esc(m.rno || `job ${pad4(m.num)}`)}</span></header>
    <ol class="qa-steps">${m.steps.map((x, k) => `<li class="done"><span class="qa-n">${String(k + 1).padStart(2, '0')}</span><span class="qa-st" aria-hidden="true">✓</span><span class="qa-t">${esc(x.text)}</span></li>`).join('')}</ol>
    ${m.lore ? `<p class="th-lore">${esc(m.lore)}</p>` : ''}${sign(m.giver, m.sig)}
    <p class="th-pick">Pick one</p><div class="qa-items">${rows}</div>${later}</div>`;
}

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
  const m = { id: 't3', num: 3, title: c.title, giver: c.giver || '', reason: c.reason || '', faction: c.faction || null, short: !!c.short, state: done ? 'done' : 'active', tracked: true,
    lore: pfill(c.lore || ''), took: null, waiting: done, steps, sig: sigOf(4471), icon: first?.icon || 'npc' };
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
  const acts = '<button type="button" class="btn">Untrack</button><button type="button" class="btn">On map</button><button type="button" class="btn small">Set aside</button>';
  let body = '';
  if (stage === 'offer' || stage === 'turnin') {
    body = !p.said ? `<p class="quiet thp-none">${esc(p.c.title)} ends at a kill switch: no last lines, only the reward.</p>`
      : `<div class="thp-map">${questPanel(p.said, p.m, { ...p.ctx, age: ageOf(ui, `${stage}:${p.chain}`) })}</div>`;
  } else if (stage === 'progress') body = `<div class="thp-mail">${questReader(p.m, acts)}</div>`;
  else body = `<div class="thp-gain">${questReward(p.m, p.items)}</div>`;
  const tab = (k, label, on) => `<button type="button" role="tab" data-thp-stage="${k}" aria-selected="${on}">${esc(label)}</button>`;
  return `<div class="thp" role="dialog" aria-label="Quest window preview">
    <header class="thp-bar"><span class="thp-k">Quest window</span>
      <nav class="ltabs thp-tabs" role="tablist" aria-label="Stage">${PREVIEW.stages.map(([k, l]) => tab(k, l, k === stage)).join('')}</nav>
      <button type="button" class="btn small" data-thp-chain title="Another thread">${esc(p.c.title)} ›</button>
      <button type="button" class="btn small thp-x" data-thp-close title="Close (Esc)" aria-label="Close">×</button></header>
    <div class="thp-body s-${stage}">${inert(body)}</div></div>`;
}

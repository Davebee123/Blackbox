// Floor jobs in Mail (arcs.mjs): their own section over Contracts, a row a floor whose chain is under way (the floor's
// number on a filled amber flag, the chain's sender and title, its step n/N or Ready), and the chain's page as the picked
// quest window (quest-view.mjs, the Transmission): the sender's mark, the chain's title and why, its steps as a job (✓
// done, ▸ the one you're on, the ones ahead encrypted), then the step's letter and its contract. Its pick of three is
// the Transmission's signed receipt.
import { esc } from './view.mjs';
import { FLOORS } from './data.mjs';
import { openContracts, title, ready } from './mail.mjs';
import { chainOf, arcOffer } from './arcs.mjs';
import { questReader, questReward, sigOf } from './quest-view.mjs';
import { FACTIONS } from './factions.mjs';
import STORY_TEXT from './content/story.mjs';

const giverOf = (ch) => (ch.faction ? FACTIONS[ch.faction].name : STORY_TEXT.contacts?.[ch.from] || ch.from);
const floorTip = (n) => `Floor ${n}, ${FLOORS[n - 1]?.name || ''}. Its own jobs, one after another. They never expire and don’t count toward the contracts you hold.`;

// One chain as the quest window's model (quest-view.mjs modelOf's shape).
export function arcModel(s, n, { upTo = null } = {}) {
  const ch = chainOf(n), A = s.arcs?.[n] || {}, cur = openContracts(s).find((c) => c.chain === n) || null;
  const at = A.done ? ch.steps.length : cur ? cur.step : A.step ?? 0;
  const steps = ch.steps.map((st, i) => (i < at
    ? { done: true, text: A.titles?.[i] || st.subject }
    : i === at && cur ? { now: true, text: title(s, cur) } : { fog: true, text: '???', len: 14 + String(st.subject || '').length }));
  return { id: `arc${n}`, num: n, title: ch.title, giver: giverOf(ch), reason: ch.reason, faction: ch.faction || (ch.from === 'claims' ? 'halcyon' : null), short: false,
    state: A.done ? 'done' : 'active', lore: A.done ? ch.lore : '', took: (A.took || []).filter(Boolean).at(-1) || null, steps: upTo == null ? steps : steps.slice(0, upTo + 1),
    sig: sigOf((s.floors?.seed || 1) * 31 + n), icon: 'npc', tag: `floor ${n}`, rno: `floor ${String(n).padStart(2, '0')}`, jobLabel: `floor ${String(n).padStart(2, '0')} · ${FLOORS[n - 1]?.name || ''}`,
    fogTip: 'Not yet. The next letter says.' };
}

// ---------- the list ----------
export function arcRows(s, openId = null, unread = new Set()) {
  const open = openContracts(s).filter((c) => c.chain).sort((a, b) => a.chain - b.chain);
  const rows = open.map((c) => {
    const ch = chainOf(c.chain), ok = ready(s, c);
    return `<li><button type="button" class="mrow has-f arc-row${unread.has(c.id) ? ' unread' : ''}${openId === c.id ? ' open' : ''}" data-mail="j${c.id}"><span class="mrow-f arc-f" title="${esc(floorTip(c.chain))}">${c.chain}</span><span class="mfrom">${esc(giverOf(ch))}</span><span class="msubj">${esc(ch.title)}</span><span class="tag ${ok ? 'you' : 'arc-n'}" title="${esc(ok ? 'Ready to deliver.' : `${c.step} of ${ch.steps.length} steps done.`)}">${ok ? 'Ready' : `${c.step}/${ch.steps.length}`}</span></button></li>`;
  }).join('');
  const waiting = arcOffer(s) ? '<span class="tag th-tag" title="A reward to pick">reward</span>' : '';
  return rows || waiting ? `<h2 title="Each floor’s own jobs, one after another. They don’t count toward the contracts you hold.">Floor jobs · ${open.length} ${waiting}</h2>${rows ? `<ul class="mlist marcs">${rows}</ul>` : ''}` : '';
}

// ---------- the page: the chain, then the step's letter and its contract (box: view.mjs jobBox) ----------
export function arcReader(s, c, box = '') {
  const pick = arcOffer(s) ? '<button type="button" class="btn primary" data-th-offer>Pick your reward</button>' : '';
  const body = (c.body || []).filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('');
  return questReader(arcModel(s, c.chain), pick, `<div class="arc-step"><p class="arc-subj">${esc(c.subject)}</p><div class="mbody">${body}</div>${box}</div>`);
}

// ---------- the reward: pick one of three on the signed receipt ----------
export function arcOfferMarkup(s) {
  const o = arcOffer(s);
  if (!o || !chainOf(o.floor)) return '';
  const m = arcModel(s, o.floor, { upTo: o.step });
  m.steps = m.steps.map((x) => ({ ...x, done: true, now: false, fog: false }));
  if (!o.last) m.lore = '';
  return questReward(m, o.items, 'mail take');
}

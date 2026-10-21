// The Loadout's Daemons tab (view.mjs re-exports daemonsMarkup): the party. Your class at the top, with how many
// daemons you run and how many of the forty you've found. Party: you first, then each slotted daemon, each with a bar
// of the fight's first 12 cycles saying when it acts (daemons.mjs daemonCycles, runDaemons' own rule); a triggered one
// gets a dashed lane with its trigger, and the next locked slot shows the level it opens at. Pick a cycle and the
// order of play for it reads across under the bar (daemons.mjs playOrder). Bench: what you hold but haven't slotted.
// Roster: all forty by the levels that drop them, the unfound as silhouettes. Each daemon wears its sprite
// (daemon-sprites.mjs). Nothing on the cards is a rule: a sticky panel says what the picked one does (a bottom sheet
// on a phone), and it alone carries the rule's highlights (ruletext.mjs) and the Slot, Unslot and Swap buttons.
// Styles: daemons.css. Clicks: app.js (data-dmn-sel, data-dmn-cycle, data-dmn-view; the buttons are data-command).
import { DAEMONS, DAEMON_BANDS, DAEMON_DROP, bandDaemons, daemonBand, daemonN, codeUnit, SERVER, FLOORS, ARCHETYPES, SUBS, LOADOUT, xpToNext } from './data.mjs';
import { active, serverLevel, classOf, hackerLevel, hackerOf, subOf } from './combat.mjs';
import { daemonLevel, daemonSlots, slottedDaemons, daemonText, daemonCycles, playOrder } from './daemons.mjs';
import { ruleHtml } from './ruletext.mjs';
import { EMBLEMS } from './class-emblems.mjs';
import { spriteHtml, roleOf, ROLE_WORD } from './daemon-sprites.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// What the tab is showing: the party (and bench) or the roster, the daemon picked (the panel; on a phone the sheet is
// open only while one is picked) and the cycle whose order of play shows. app.js sets these.
export const daemonUi = { view: 'party', sel: null, cycle: 1 };
export const CYCLES = 12;
const ORDER = Object.keys(DAEMONS); // catalogue order, level by level

// ---------- words ----------
// When a triggered daemon acts, as a sentence (data.mjs DAEMONS `on`).
export const TRIGGER = {
  start: 'As a fight starts',
  half: 'When you drop below half health',
  quarter: 'When you drop below a quarter of your health',
  crash: 'When a hit would take you to 0',
  big: 'When a big attack is about to land',
  cut: 'When you interrupt a move',
  stripped: "When a part's last ◆ breaks",
  told: 'When a part starts winding up a tell',
  charge: 'When a part winds up a charge',
  answered: 'When you answer a tell',
  soaked: 'When your shield takes a hit',
  burnout: 'When one of your burns runs out',
  crit: 'When you land a critical strike',
  broke: 'When a part breaks',
  low: 'When a part drops below a quarter of its Integrity',
  synced: 'When you fire in a Sync Window',
};
const ONCE_A_CYCLE = new Set(['backscatter', 'ricochet']); // daemons.mjs ON[…].cycle
// "Every 3 cycles, after you", or its trigger ("When a part starts winding up a tell, once a fight").
export function actsLine(id) {
  const d = DAEMONS[id];
  if (d.cd) return `Every ${d.cd} cycles, after you${d.exfil ? ', in an Exfil fight' : ''}`;
  return `${TRIGGER[d.on] || d.on}${d.once ? ', once a fight' : ONCE_A_CYCLE.has(id) ? ', once a cycle at most' : ''}`;
}
const actsTip = (id) => (DAEMONS[id].cd
  ? `It acts in a fight's first cycle, then every ${DAEMONS[id].cd} cycles: right after your command, before burns and helpers, and in party order with your other daemons. When it has nothing to do, it tries again the next cycle.${DAEMONS[id].exfil ? ' Only in a fight against an Exfil.' : ''}`
  : 'It acts whenever this happens, in any step of the cycle. A shield or a heal lands at once; a hit lands when the step it came in is over. Daemons never set off daemons.');
const shortWhen = (id) => (DAEMONS[id].cd ? `every ${DAEMONS[id].cd} cycles` : actsLine(id).replace(/^When /, 'when ').replace(/^As /, 'as '));
// What its number counts, read off its rule.
export function unitOf(id) {
  const r = DAEMONS[id].rule;
  if (/[Hh]eals you for \{n\}%/.test(r)) return '% heal';
  if (/[Hh]eals you for \{n\}, or shields/.test(r)) return ' heal or shield';
  if (/[Ss]hields you for \{n\}/.test(r)) return ' shield';
  if (/[Hh]eals you for \{n\}/.test(r)) return ' heal';
  if (/for \{n\} a cycle/.test(r)) return ' burn a cycle';
  return ' damage';
}
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const pct = (x) => (x >= 0.1 ? `${Math.round(x * 100)}%` : `${(x * 100).toFixed(1)}%`);

// ---------- where it drops ----------
// The levels whose invasions drop a band's daemons as their own: from its first level to the level before the next
// band's (an invasion drops the deepest band its level has reached; data.mjs daemonBand).
export function dropLevels(band) {
  const lo = DAEMON_BANDS[band - 1][0], next = DAEMON_BANDS[band]?.[0];
  return [lo, next ? next - 1 : DAEMON_BANDS[band - 1][1]];
}
export function dropOf(s, id) {
  const b = DAEMONS[id].band, [lo, hi] = dropLevels(b), per = bandDaemons(b).length, yours = daemonBand(serverLevel(s));
  const floors = FLOORS.filter((f) => f.band[0] <= hi && f.band[1] >= lo).map((f) => f.name);
  // rollDaemon: your band's, or (a quarter of the time) an earlier band's, picked evenly.
  const share = b === yours ? (yours > 1 ? 1 - DAEMON_DROP.earlier : 1) / per : b < yours ? DAEMON_DROP.earlier / (yours - 1) / per : 0;
  return { lo, hi, floors, share, level: serverLevel(s) };
}
function foundIn(s, id) {
  const x = dropOf(s, id), O = DAEMON_DROP;
  const tip = `${x.share ? `${pct(x.share)} of the daemons invasions drop at your level (${x.level}) are this one.` : `Invasions at your level (${x.level}) don't drop it yet.`} An invasion you stop leaves a daemon ${pct(O.you)} of the time when you kill it, ${pct(O.intercept)} when you intercept it and ${pct(O.wall)} when the wall wears it down, and always from a capture; each stop without one adds ${pct(O.pity)}. A quarter of drops are an earlier level's daemon, so deeper invasions drop it now and then too.`;
  return `<span title="${esc(tip)}">Invasions from ${esc(list(x.floors))} (levels ${x.lo}–${x.hi})</span>`;
}

// ---------- pieces ----------
const face = (id, found = true, size = 6.5) => spriteHtml(id, { found, size });
const isFound = (s, id) => daemonLevel(s, id) > 0;
const benchOf = (s) => ORDER.filter((id) => isFound(s, id) && !slottedDaemons(s).includes(id)).sort((a, b) => daemonLevel(s, b) - daemonLevel(s, a) || ORDER.indexOf(a) - ORDER.indexOf(b));
// A pickable daemon: pressed when you picked it; the one the panel shows with nothing picked is only marked (data-shown,
// lit on a wide screen, where the panel shows it; a phone's sheet stays shut).
const pick = (id, shown) => { const on = id === shown, chosen = on && daemonUi.sel === id; return `data-dmn-sel="${id}" aria-pressed="${chosen}"${on && !chosen ? ' data-shown' : ''}`; };
const cellsOf = (id) => new Set(daemonCycles(id, CYCLES));

function head(s) {
  const cls = classOf(s), a = ARCHETYPES[cls], sub = SUBS[subOf(s, cls)], lvl = hackerLevel(s, cls), xp = hackerOf(s, cls).xp || 0;
  const party = slottedDaemons(s).length, found = ORDER.filter((id) => isFound(s, id)).length, v = daemonUi.view;
  const bar = lvl < LOADOUT.maxLevel ? `<span class="dm-xp" title="${xp}/${xpToNext(lvl)} XP to level ${lvl + 1}"><i style="width:${Math.min(100, (xp / xpToNext(lvl)) * 100).toFixed(1)}%"></i></span>` : '';
  const tab = (k, label, n, tip) => `<button type="button" data-dmn-view="${k}" aria-pressed="${v === k}" title="${esc(tip)}">${label}<small>${n}</small></button>`;
  return `<header class="dm-head">${EMBLEMS[cls] ? `<pre class="dm-emblem" aria-hidden="true">${esc(EMBLEMS[cls].join('\n'))}</pre>` : ''}
    <div class="dm-id"><h2>${esc(a.name)}</h2><h1>${esc(sub ? sub.name : a.name)}</h1><div class="dm-lv"><b>Lv ${lvl}</b>${bar}</div></div>
    <nav class="dm-views" aria-label="Daemons">${tab('party', 'Party', `${party}/${daemonSlots(s)}`, `Daemons slotted, of your ${daemonSlots(s)} slots`)}${tab('roster', 'Roster', `${found}/${ORDER.length}`, `Daemons you've found, of all ${ORDER.length}`)}</nav></header>`;
}

// One row of the party: who, then a cell a cycle (lit where it acts) or a dashed lane with its trigger.
function partyRow(s, id, sel, cyc) {
  const d = DAEMONS[id], L = daemonLevel(s, id);
  const who = `<button type="button" class="dm-who" ${pick(id, sel)}><span class="dm-face">${face(id)}</span><span class="dm-nm"><b>${esc(d.name)}</b><small>Lv ${L} · ${esc(ROLE_WORD[roleOf(id)])}</small></span></button>`;
  if (!d.cd) return `${who}<span class="dm-lane${d.once ? ' once' : ''}" title="${esc(actsLine(id))}"><span class="dm-lt">${esc(actsLine(id))}</span></span>`;
  const on = cellsOf(id);
  return who + Array.from({ length: CYCLES }, (_, i) => {
    const c = i + 1, lit = on.has(c);
    return `<span class="dm-cell${lit ? ` on${d.exfil ? ' exfil' : ''}` : ''}${c === cyc ? ' sel' : ''}" data-dmn-cycle="${c}" title="${esc(lit ? `Cycle ${c}: ${d.name} acts${d.exfil ? ' (in an Exfil fight)' : ''}` : `Cycle ${c}`)}"><i></i></span>`;
  }).join('');
}

// The order of play in the picked cycle: you ▸ daemons in party order ▸ burns and helpers ▸ the virus, and beside
// it the triggered daemons, armed.
export function orderMarkup(s, cyc) {
  const o = playOrder(s, cyc), gt = '<span class="dm-gt" aria-hidden="true">▸</span>';
  const chip = (cls, text, tip) => `<span class="dm-st ${cls}" title="${esc(tip)}">${esc(text)}</span>`;
  const steps = [
    ...o.start.map((id) => chip('dm', DAEMONS[id].name, `${DAEMONS[id].name}: as the fight starts, before your first command`)),
    chip('you', 'You', 'Your command goes first: a part you break now never fires'),
    ...o.daemons.map((id) => chip('dm', DAEMONS[id].name, `${DAEMONS[id].name}: ${daemonText(id, daemonLevel(s, id))}${DAEMONS[id].exfil ? ' (in an Exfil fight)' : ''}`)),
    chip('burns', 'Burns and helpers', 'Your burns tick and your helpers hit'),
    chip('them', 'The virus', "The virus's attacks due this cycle land"),
  ];
  const armed = o.armed.map((id) => chip('armed', `${DAEMONS[id].name} · ${actsLine(id).toLowerCase()}`, `${DAEMONS[id].name} is armed: it acts whenever this happens, in any step`)).join('');
  return `<div class="dm-order" role="group" aria-label="Order of play in cycle ${cyc}"><span class="dm-k">Cycle ${cyc}</span><span class="dm-steps">${steps.join(gt)}</span>${armed ? `<span class="dm-armed">${armed}</span>` : ''}</div>`;
}

function partySec(s, sel) {
  const cyc = Math.min(CYCLES, Math.max(1, daemonUi.cycle || 1)), party = slottedDaemons(s), n = daemonSlots(s), lvl = serverLevel(s);
  const next = SERVER.daemonSlotsAt.find((l) => lvl < l);
  const heads = `<span class="dm-corner">Cycle</span>${Array.from({ length: CYCLES }, (_, i) => `<button type="button" class="dm-ch" data-dmn-cycle="${i + 1}" aria-pressed="${i + 1 === cyc}" title="Cycle ${i + 1}: the order of play">${i + 1}</button>`).join('')}`;
  const cls = classOf(s), sub = SUBS[subOf(s, cls)];
  const you = `<div class="dm-who you"><span class="dm-face">YOU</span><span class="dm-nm"><b>You</b><small>${esc(sub ? sub.name : ARCHETYPES[cls].name)} · Lv ${hackerLevel(s, cls)}</small></span></div>${Array.from({ length: CYCLES }, (_, i) => `<span class="dm-cell me${i + 1 === cyc ? ' sel' : ''}" data-dmn-cycle="${i + 1}" title="Cycle ${i + 1}: your command"><i></i></span>`).join('')}`;
  const rows = Array.from({ length: n }, (_, i) => party[i]).map((id) => (id ? partyRow(s, id, sel, cyc) : '<div class="dm-who empty">Empty slot</div><span class="dm-lane none"></span>')).join('');
  const locked = next ? `<div class="dm-who locked" title="${esc(`Another slot when your server reaches level ${next} (your highest class level)`)}">Slot ${n + 1} · level ${next}</div><span class="dm-lane none"></span>` : '';
  return `<section class="dm-sec daemon-slots" aria-label="Party"><h3 class="dm-h">Party<small>${party.length}/${n}</small></h3><div class="dm-body"><div class="dm-turns">${heads}${you}${rows}${locked}</div>${orderMarkup(s, cyc)}</div></section>`;
}

function benchSec(s, sel) {
  const ids = benchOf(s);
  const rows = ids.map((id) => `<button type="button" class="dm-who" ${pick(id, sel)}><span class="dm-face">${face(id, true, 5.5)}</span><span class="dm-nm"><b>${esc(DAEMONS[id].name)}</b><small>Lv ${daemonLevel(s, id)} · ${esc(shortWhen(id))}</small></span></button>`).join('');
  return `<section class="dm-sec" aria-label="Bench"><h3 class="dm-h">Bench<small>${ids.length}</small></h3><div class="dm-body">${rows ? `<div class="dm-bench">${rows}</div>` : '<p class="dm-none">None</p>'}</div></section>`;
}

function rosterSec(s, sel) {
  const found = ORDER.filter((id) => isFound(s, id)).length, party = slottedDaemons(s);
  const groups = DAEMON_BANDS.map((_, i) => {
    const ids = bandDaemons(i + 1), [lo, hi] = dropLevels(i + 1), have = ids.filter((id) => isFound(s, id)).length;
    const rows = ids.map((id) => (isFound(s, id)
      ? `<button type="button" class="dm-row" ${pick(id, sel)}><span class="dm-face">${face(id, true, 5)}</span><span class="dm-rn">${esc(DAEMONS[id].name)}${party.includes(id) ? '<small class="dm-in">in party</small>' : ''}</span><span class="dm-rw">${esc(shortWhen(id))}</span><span class="dm-rl">Lv ${daemonLevel(s, id)}</span></button>`
      : `<button type="button" class="dm-row unk" ${pick(id, sel)} aria-label="Not found yet"><span class="dm-face">${face(id, false, 5)}</span><span class="dm-rn">???</span><span class="dm-rw"></span><span class="dm-rl"></span></button>`)).join('');
    return `<div class="dm-group"><h4 title="${esc(`Invasions at levels ${lo}–${hi} drop these`)}">Levels ${lo}–${hi}<small>${have}/${ids.length}</small></h4><div class="dm-rows">${rows}</div></div>`;
  }).join('');
  return `<section class="dm-sec" aria-label="Roster"><h3 class="dm-h">Roster<small>${found}/${ORDER.length}</small></h3><div class="dm-body"><div class="dm-prog" title="${esc(`${found} of ${ORDER.length} found`)}"><i style="width:${((found / ORDER.length) * 100).toFixed(1)}%"></i></div>${groups}</div></section>`;
}

// ---------- the panel ----------
function mini(id) {
  const d = DAEMONS[id], on = cellsOf(id), you = Array.from({ length: CYCLES }, () => '<i class="me"></i>').join('');
  const it = d.cd ? Array.from({ length: CYCLES }, (_, i) => `<i class="${on.has(i + 1) ? 'on' : ''}"></i>`).join('') : `<span class="dm-lane"><span class="dm-lt">${esc(actsLine(id))}</span></span>`;
  return `<div class="dm-mini" title="${esc(`The first ${CYCLES} cycles of a fight: your command every cycle, and when ${d.name} acts`)}"><span>You</span>${you}<span>It</span>${it}</div>`;
}
function stronger(s, id) {
  const L = daemonLevel(s, id), n = daemonN(id, L), top = daemonN(id, SERVER.maxLevel), u = unitOf(id), b = DAEMONS[id].band, [lo, hi] = DAEMON_BANDS[b - 1];
  const tip = `Its number grows 4% a level, like a protocol's stats: ${daemonN(id, lo)} at level ${lo}, ${daemonN(id, hi)} at ${hi}, ${top} at ${SERVER.maxLevel}. An invasion can drop a higher-level copy, which replaces this one.`;
  const text = L >= SERVER.maxLevel || n >= top ? `${n}${u}, as strong as it gets` : `${n}${u} now, ${top} at level ${SERVER.maxLevel}`;
  return `<span title="${esc(tip)}">${esc(text)}</span><span class="dm-meter" role="img" aria-label="${n} of ${top}"><i style="width:${Math.min(100, (n / top) * 100).toFixed(1)}%"></i></span>`;
}
function buttons(s, id) {
  const busy = active(s), party = slottedDaemons(s), d = DAEMONS[id], off = busy ? ' disabled title="Between fights"' : '';
  if (party.includes(id)) return `<div class="row acts dm-acts"><button type="button" class="btn" data-command="daemon unslot ${id}"${off}>Unslot</button></div>`;
  if (party.length < daemonSlots(s)) return `<div class="row acts dm-acts"><button type="button" class="btn primary" data-command="daemon slot ${id}"${off}>Slot</button></div>`;
  return `<div class="dm-acts swap">${party.map((o) => `<button type="button" class="btn small" data-command="daemon swap ${o} ${id}"${busy ? off : ` title="${esc(`${d.name} takes ${DAEMONS[o].name}'s place in your party`)}"`}><span class="dm-face">${face(o, true, 3.6)}</span>Swap with ${esc(DAEMONS[o].name)}</button>`).join('')}</div>`;
}
export function panelMarkup(s, id) {
  if (!id || !DAEMONS[id]) return '';
  const close = '<button type="button" class="dm-close" data-dmn-sel="" aria-label="Close">×</button>';
  if (!isFound(s, id)) {
    return `${close}<div class="dm-ph"><span class="dm-frame unk">${face(id, false, 9)}</span><div><h2 class="dm-name">???</h2><p class="dm-sub">Not found yet</p></div></div>
      <dl class="dm-facts"><dt>Found in</dt><dd>${foundIn(s, id)}</dd></dl>`;
  }
  const d = DAEMONS[id], L = daemonLevel(s, id), party = slottedDaemons(s);
  return `${close}<div class="dm-ph"><span class="dm-frame">${face(id, true, 9)}</span><div><h2 class="dm-name">${esc(d.name)}</h2><p class="dm-sub">Level ${L}${party.includes(id) ? ' <span class="tag you">In party</span>' : ''}</p></div></div>
    <p class="dm-does">${ruleHtml(daemonText(id, L))}</p>
    <dl class="dm-facts">
      <dt>Acts</dt><dd><span title="${esc(actsTip(id))}">${esc(actsLine(id))}</span>${mini(id)}</dd>
      <dt>Gets stronger</dt><dd>${stronger(s, id)}</dd>
      <dt>Found in</dt><dd>${foundIn(s, id)}</dd>
      <dt>Scrap for</dt><dd><span title="When a better copy replaces this one, this one scraps for a unit of the invader's code (4 + its level ÷ 3)">${codeUnit(L)} code</span></dd>
    </dl>${buttons(s, id)}`;
}

export function daemonsMarkup(s) {
  const party = slottedDaemons(s), bench = benchOf(s), roster = daemonUi.view === 'roster';
  const sel = DAEMONS[daemonUi.sel] ? daemonUi.sel : null;
  // With nothing picked, the panel shows the first of your party (or bench) on a wide screen; a phone's sheet stays shut.
  const shown = sel || party[0] || bench[0] || (roster ? ORDER[0] : null);
  const body = roster ? rosterSec(s, shown) : partySec(s, shown) + benchSec(s, shown);
  const panel = shown ? `<aside class="dm-panel${sel ? ' open' : ''}" aria-label="${esc(isFound(s, shown) ? DAEMONS[shown].name : 'Not found yet')}">${panelMarkup(s, shown)}</aside>` : '';
  return `<div class="dm-page${shown ? '' : ' no-panel'}"><section class="card dm-card">${head(s)}${body}</section>${panel}</div>`;
}

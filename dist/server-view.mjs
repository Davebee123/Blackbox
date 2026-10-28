// The Server page (docs/ui.md, GAME_RULES.md "The pages, at a glance"): your home server as one quiet card and a
// detail panel beside it. The card is names, numbers, pips and state: a header with the firewall drawn as a ring of
// sixteen blocks round your server's core (its Integrity the inner ring), then a row each for the threat, the wall,
// filters, daemons, the servers that send invasions, your network and your code. Pick anything and the panel says
// what it is, lights the facts that matter (ruletext.mjs ruleHtml: the only place on the page that does) and holds
// the buttons, each a real command. Point at a button that changes the wall or the server (or tap it once on a
// phone) and the panel shows before and after, worked out by running that command on a copy of the save
// (previewOf). On a phone the panel is a bottom sheet.
import { glyph } from './glyphs.mjs';
import { ruleHtml } from './ruletext.mjs';
import { esc, wallRuler, safetyTip, networkCardMarkup, serverNext, fmtTime, invaderStatus } from './view.mjs';
import { serverLevel, serverClass, subOf, topUpCost, active, daemonSlots, slottedDaemons, materialsOf, bindRooms } from './combat.mjs';
import { CONFIG, SUBS, ARCHETYPES, DAEMONS, SERVER, FAMILIES, QUIRKS, MUTATIONS, STRAINS, daemonWhen, daemonBand } from './data.mjs';
import { daemonText } from './daemons.mjs';
import { FIREWALL, TIER_PERKS, TIERS, BASE_GAP, effLevel, upgradeCost, defragCost, defragMs, hardenCost, baseOf, tierOf, fragLevels, canPay, wallBonus, defragging, hardenLeft, fwOf, tickFirewall, perksAt } from './firewall.mjs';
import { filtersOf, equipped, slotsOf, FILTER_STATS, FILTER_CAP, filterStat } from './filters.mjs';
import { wallBands, wallRating, wallSafety, sendersOf, senderGrade, sendsAt, countsAt, verdictOf, ratioOf, outcome, strength, chipRate, grindRate, bountyOf, tellOf, quirkLine, labelOf, KINDS, streakOf, streakMult, STREAK, SCOUT, daemonChance, degradedLeft, invasionsLive } from './invasion.mjs';
import { MATERIALS, codeOf } from './gear.mjs';
import { sigOf } from './network.mjs';
import { PROGRAMS, programsOn, SOCKET } from './sockets.mjs';
import { play } from './run.mjs';

// Read without the game's lazy defaults (hidden.mjs items, sockets.mjs codebasesOf, network.mjs intelOf): drawing the page
// never writes to the save.
const kitOf = (s) => s.items || {};
const codebasesOf = (s) => s.codebases || SOCKET.start;
const intelOf = (s, who) => s.netIntel?.[who] || { fam: {} };
const pct = (x, y) => `${Math.max(0, Math.min(100, (x / Math.max(1e-9, y)) * 100)).toFixed(1)}%`;
const pct1 = (x) => `${Math.round(x * 10) / 10}%`;
const fmt = (n) => Number(n).toLocaleString('en-GB');
// m:ss for a clock counting down.
const clock = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const TONE = { ok: 'you', mid: 'warn', low: 'hot', down: 'hot' };
const V_TONE = { blocked: 'you', siege: 'warn', breach: 'hot' };
const V_WORD = { blocked: 'blocks it', siege: 'contests it', breach: 'breaks' };
const busyOf = (s) => (active(s) ? 'Finish the fight first' : s.run ? 'Jack out first' : '');
// The readout in a word or two: Safe, the lowest level that gets in, or the wall down.
const readout = (w) => (w.state === 'ok' ? 'Safe' : w.state === 'down' ? 'Wall down' : `lv ${w.vuln}+`);
const readoutLong = (w) => (w.state === 'ok' ? 'Safe' : w.state === 'down' ? 'Wall down' : `Vulnerable to lv ${w.vuln}+`);

// ---------- before and after: a command run on a copy of the save ----------
// The commands that change the wall or the server and have something to show before they run. Jack in is a fight,
// and scrapping a filter changes nothing on the wall: neither has a preview.
const PREVIEWS = /^(repair|firewall (upgrade|defrag|harden)|open ports|close ports|filter (equip|unequip) \d+)$/;
export const previewable = (cmd) => PREVIEWS.test(cmd || '');
// A deep copy of the save: what a preview runs on. The real save is never touched.
export function copyOf(s) {
  let c;
  try { c = structuredClone(s); } catch { c = JSON.parse(JSON.stringify(s)); }
  return bindRooms(c);
}
// What the page reads back after an action: the wall's level, the Safe readout, the verdict on the invasion out now
// and its chip, Integrity, credits, and the invasion clock.
export function readBack(s, now = Date.now()) {
  const b = wallBands(s), w = wallSafety(s, b), inv = s.invasion;
  return {
    eff: effLevel(s, now), safe: w.state, vuln: w.vuln, verdict: inv ? verdictOf(s, inv) : null,
    chip: inv && inv.state !== 'travel' && !s.degraded ? chipRate(ratioOf(s, inv)) : 0,
    integrity: s.server.integrity, max: s.server.max, credits: s.server.credits, next: s.net?.next ?? null, open: !!s.net?.open,
    hardened: Math.round(hardenLeft(s, now) / 1000) * 1000, frag: Math.floor(fwOf(s).frag || 0),
  };
}
// Runs cmd on a copy through the game's own dispatcher (run.mjs play, as the prompt does) and reads the copy back.
// refused: the warning the game gave instead, if it wouldn't do it. done: a defrag's wall once it has finished.
const memo = { key: null, value: null };
export function previewOf(s, cmd, now = Date.now()) {
  if (!previewable(cmd)) return null;
  const key = `${cmd}|${s.serial}|${Math.floor(now / 1000)}`;
  if (memo.key === key && memo.s === s) return memo.value;
  const before = readBack(s, now), copy = copyOf(s);
  const events = play(copy, cmd);
  const refused = events.findLast((e) => e.type === 'warning')?.message || null;
  const after = readBack(copy, now);
  let done = null;
  if (/defrag$/.test(cmd) && !refused) {
    const at = fwOf(copy).defragUntil, later = copyOf(copy);
    tickFirewall(later, at);
    done = { ms: Math.round((at - now) / 1000) * 1000, ...readBack(later, at) };
  }
  const value = { cmd, before, after, done, refused };
  Object.assign(memo, { key, s, value });
  return value;
}
const verdictName = (v) => (v ? V_WORD[v].replace(/ it$/, '') : '');
// The preview as rows, each before → after; what didn't change is left out, except the wall and its readout.
export function previewMarkup(s, cmd, now = Date.now()) {
  const p = previewOf(s, cmd, now);
  if (!p) return '';
  if (p.refused) return `<p class="hsv-refused">${esc(p.refused)}</p>`;
  const { before: b, after: a } = p, inv = s.invasion;
  const row = (label, x, y, tone = '') => `<dt>${esc(label)}</dt><dd>${esc(x)}</dd><dd class="arrow" aria-hidden="true">→</dd><dd class="after ${tone}">${esc(y)}</dd>`;
  const rd = (x) => (x.safe === 'ok' ? 'Safe' : x.safe === 'down' ? 'Wall down' : `lv ${x.vuln}+`);
  const rows = [
    row('Wall', `lv ${b.eff}`, `lv ${a.eff}`, a.eff > b.eff ? 'you' : a.eff < b.eff ? 'warn' : ''),
    row('Readout', rd(b), rd(a), TONE[a.safe]),
    inv ? row(labelOf(inv) || 'Invasion', verdictName(b.verdict), verdictName(a.verdict), V_TONE[a.verdict]) : '',
    inv && inv.state !== 'travel' && (b.chip || a.chip) ? row('Chip a minute', `−${pct1(b.chip)}`, `−${pct1(a.chip)}`, a.chip < b.chip ? 'you' : a.chip > b.chip ? 'hot' : '') : '',
    a.integrity !== b.integrity || cmd === 'repair' ? row('Integrity', `${b.integrity}`, `${a.integrity}`, a.integrity > b.integrity ? 'you' : '') : '',
    a.hardened !== b.hardened ? row('harden.sh', b.hardened ? fmtTime(b.hardened) : 'off', fmtTime(a.hardened), 'you') : '',
    p.done ? row(`In ${fmtTime(p.done.ms)}`, `lv ${a.eff}`, `lv ${p.done.eff}`, 'you') : '',
    p.done ? row('Readout then', rd(a), rd(p.done), TONE[p.done.safe]) : '',
    a.open !== b.open ? row('Next invasion', b.next > 0 ? fmtTime(b.next) : '—', a.next > 0 ? fmtTime(a.next) : '—', a.open ? 'hot' : '') : '',
    a.open !== b.open ? row('Each pays', b.open ? `×${CONFIG.invasion.open.reward}` : '×1', a.open ? `×${CONFIG.invasion.open.reward}` : '×1', a.open ? 'you' : '') : '',
    a.credits !== b.credits ? row('Credits', fmt(b.credits), fmt(a.credits)) : '',
  ].join('');
  return `<dl class="hsv-ba">${rows}</dl>`;
}

// ---------- the ring: sixteen blocks round the core, Integrity the inner ring ----------
// Your firewall's blocks (whole: solid teal; fragmented: hollow and cracked, in the same scatter as ever), the shell
// lit while harden.sh runs, a pulsing amber arc while an invasion is at the wall, and while one is on its way a red
// marker coming down its road with the time left. The road and the arc are at the top, where invasions come in.
const SCATTER = [5, 12, 2, 9, 14, 0, 7, 11, 3, 15, 6, 1, 10, 4, 13, 8];
const C = 116, R0 = 76, R1 = 98, TOP = 48; // the centre, the blocks' inner and outer radii, the road's length above the ring
const P = (r, a) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)];
const f1 = (n) => Math.round(n * 10) / 10;
const band = (r0, r1, a0, a1) => { const [x1, y1] = P(r1, a0), [x2, y2] = P(r1, a1), [x3, y3] = P(r0, a1), [x4, y4] = P(r0, a0); return `M${f1(x1)} ${f1(y1)}A${r1} ${r1} 0 0 1 ${f1(x2)} ${f1(y2)}L${f1(x3)} ${f1(y3)}A${r0} ${r0} 0 0 0 ${f1(x4)} ${f1(y4)}Z`; };
const arcPath = (r, a0, a1) => { const [x1, y1] = P(r, a0), [x2, y2] = P(r, a1); return `M${f1(x1)} ${f1(y1)}A${r} ${r} 0 0 1 ${f1(x2)} ${f1(y2)}`; };
export function ringMarkup(s, now = Date.now()) {
  const fw = fwOf(s), frag = Math.floor(fw.frag || 0), bad = new Set(SCATTER.slice(0, frag)), mend = defragging(s, now), hard = hardenLeft(s, now) > 0;
  const max = s.server.max, hp = Math.max(0, s.server.integrity), share = hp / Math.max(1, max), tone = share < 0.3 ? 'hot' : share < 0.6 ? 'warn' : '';
  const seg = 360 / FIREWALL.blocks, gap = 1.6;
  const blocks = Array.from({ length: FIREWALL.blocks }, (_, i) => {
    const a0 = i * seg - seg / 2 + gap, a1 = (i + 1) * seg - seg / 2 - gap, m = (a0 + a1) / 2;
    if (!bad.has(i)) return `<path class="blk" d="${band(R0, R1, a0, a1)}"/>`;
    const [x1, y1] = P(R0 + 3, m - 3), [x2, y2] = P(R0 + 11, m + 2), [x3, y3] = P(R1 - 4, m - 2);
    return `<path class="blk frag${mend ? ' mend' : ''}" d="${band(R0, R1, a0, a1)}"/><path class="crack" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}L${f1(x3)} ${f1(y3)}"/>`;
  }).join('');
  const inv = s.invasion, atWall = inv && inv.state !== 'travel', onRoad = inv && inv.state === 'travel';
  const arc = atWall && !s.degraded ? `<path class="press ${inv.state}" d="${arcPath(R1 + 7, -40, 40)}"><title>${esc(`${inv.name} at your wall`)}</title></path>` : '';
  let road = '';
  if (onRoad) {
    const gone = Math.max(0, Math.min(1, 1 - inv.left / Math.max(1, inv.total))), y = f1(-TOP + 8 + (TOP + C - R1 - 24) * gone);
    road = `<g class="road-g"><title>${esc(`${inv.name}: at your wall in ${clock(inv.left)}`)}</title><line class="road" x1="${C}" y1="${-TOP}" x2="${C}" y2="${C - R1 - 8}"/>`
      + `<rect class="mark" x="${C - 6}" y="${y - 6}" width="12" height="12" transform="rotate(45 ${C} ${y})"/><text class="eta" x="${C + 14}" y="${f1(y + 7)}">${clock(inv.left)}</text></g>`;
  }
  const r = 63, c = 2 * Math.PI * r;
  return `<svg class="hsv-ring${s.degraded ? ' down' : ''}" viewBox="0 ${-TOP} ${C * 2} ${C * 2 + TOP}" role="img" aria-label="${esc(`Firewall ${FIREWALL.blocks - frag} of ${FIREWALL.blocks} blocks whole; Integrity ${hp} of ${max}${inv ? `; ${inv.name} ${onRoad ? 'on its way' : 'at your wall'}` : ''}`)}">
    <circle class="shell${hard ? ' on' : ''}" cx="${C}" cy="${C}" r="${R1 + 10}"/>${road}
    <g class="blocks"><title>${esc(`${FIREWALL.blocks - frag}/${FIREWALL.blocks} whole${fragLevels(s) ? ` · −${fragLevels(s)} lv` : ''}${mend ? ' · defragmenting' : ''}`)}</title>${blocks}</g>${arc}
    <g class="core"><title>${esc(`Integrity ${hp}/${max}`)}</title><circle class="pit" cx="${C}" cy="${C}" r="57"/><circle class="track" cx="${C}" cy="${C}" r="${r}"/>
      <circle class="integ ${tone}" cx="${C}" cy="${C}" r="${r}" stroke-dasharray="${f1(c * share)} ${f1(c)}" transform="rotate(-90 ${C} ${C})"/>
      <text class="num ${tone}" x="${C}" y="${C + 10}" text-anchor="middle">${hp}</text><text class="of" x="${C}" y="${C + 30}" text-anchor="middle">/ ${max}</text></g></svg>`;
}

// ---------- the model: what the page reads, once a draw ----------
function model(s, now) {
  const b = wallBands(s), w = wallSafety(s, b), held = filtersOf(s), on = (s.filters?.on || []).slice(0, slotsOf(s)).filter((i) => held[i]);
  const senders = sendersOf(s).map((l) => ({ loc: l, grade: senderGrade(l), counts: sendsAt(l), meets: s.degraded ? 'breach' : outcome(wallRating(s, l.family) / strength(l.level || 1, null, senderGrade(l))) }))
    .sort((x, y) => y.counts - x.counts || (y.loc.level || 1) - (x.loc.level || 1));
  return { b, w, held, on, senders, busy: busyOf(s), inv: s.invasion || null, now };
}

// ---------- the header ----------
function header(s, M, ui) {
  const sv = s.server, lvl = serverLevel(s), cls = serverClass(s), sub = subOf(s, cls), share = sv.integrity / Math.max(1, sv.max);
  const tone = share < 0.3 ? 'hot' : share < 0.6 ? 'warn' : 'you', cost = topUpCost(s, 'server');
  const why = sv.integrity <= 0 ? 'Crashed: it reboots on its own' : !cost ? 'Integrity is full' : M.busy;
  const repair = `<button type="button" class="btn small hsv-repair" data-command="repair" data-preview="repair" data-act="repair"${why ? ` disabled title="${esc(why)}"` : ` title="Integrity full now: ${cost} credits"`}>Repair${cost ? pcost(s, { credits: cost }) : ''}</button>`;
  const next = serverNext(lvl), inv = M.inv;
  const third = inv
    ? pickBtn('inv', `${esc(labelOf(inv))} <b class="${inv.state === 'travel' ? 'hot' : 'warn'}">${inv.state === 'travel' ? clock(inv.left) : inv.state === 'watch' ? clock(inv.mapLeft) : `${Math.round(inv.hp * 100)}%`}</b>`, ui, 'hsv-vital', inv.state === 'travel' ? 'Time to your wall' : 'Left of it')
    : s.degraded ? pickBtn('core', `Rebooting <b class="hot">${fmtTime(degradedLeft(s, M.now))}</b>`, ui, 'hsv-vital')
      : pickBtn('next', `Next <b>${invasionsLive(s) && s.net?.next > 0 ? `~${fmtTime(s.net.next)}` : '—'}</b>`, ui, 'hsv-vital', invasionsLive(s) ? 'The next invasion sets out' : 'Nothing attached sends invasions');
  const vitals = [
    pickBtn('wall', `Wall <b class="${TONE[M.w.state]}">${esc(readout(M.w))}</b>`, ui, 'hsv-vital', safetyTip(s, M.w)),
    pickBtn('streak', `Streak <b class="${streakOf(s) ? 'you' : ''}">${streakOf(s)}</b>`, ui, 'hsv-vital'),
    third,
  ].join('');
  return `<div class="hsv-top">${pickWrap('core', ringMarkup(s, M.now), ui, 'hsv-ringbtn', 'Your server')}<div class="hsv-id"><h2>Server · ${esc(sigOf(s, 'you')?.name || 'your network')}</h2>
    <h1>HOME <span class="tag you" title="${esc(`Your highest class level${next ? `. ${next}` : ''}`)}">Lv ${lvl}</span><span class="tag dim">${esc(sub ? SUBS[sub]?.name : ARCHETYPES[cls]?.name || '')}</span>${s.degraded ? `<span class="tag hot" title="Wall down while it reboots">Degraded · ${fmtTime(degradedLeft(s, M.now))}</span>` : ''}</h1>
    <div class="hsv-int">${pickBtn('core', `<span class="t">Integrity</span><span class="bar ${tone}"><i style="width:${pct(sv.integrity, sv.max)}"></i></span><b class="${tone}">${sv.integrity}</b><span class="t">/ ${sv.max}</span>`, ui, 'hsv-intbtn', `Integrity ${sv.integrity}/${sv.max}`)}${repair}</div></div>
    <nav class="hsv-vitals" aria-label="At a glance">${vitals}</nav></div>`;
}
// A price: an icon and a number for each thing it takes (amber: what you use), red where you're short.
function pcost(s, c) {
  const have = { credits: s.server.credits, ...materialsOf(s) };
  return `<span class="pcost">${Object.entries(c).filter(([, n]) => n).map(([k, n]) => `<span class="${(have[k] ?? 0) < n ? 'short' : ''}" title="${esc(k === 'credits' ? 'Credits' : MATERIALS[k]?.name || k)}">${glyph(k)}${fmt(n)}</span>`).join('')}</span>`;
}
// Anything on the card you can pick: a button with its key; the picked one lit.
const pickBtn = (key, inner, ui, cls = '', tip = '') => `<button type="button" class="${cls} hsv-pick" data-svkey="${esc(key)}" aria-pressed="${ui.sel === key}"${tip ? ` title="${esc(tip)}"` : ''}>${inner}</button>`;
const pickWrap = (key, inner, ui, cls = '', label = '') => `<button type="button" class="${cls} hsv-pick" data-svkey="${esc(key)}" aria-pressed="${ui.sel === key}" aria-label="${esc(label)}">${inner}</button>`;
const sec = (title, small, body, cls = '') => `<section class="hsv-sec ${cls}"><h3>${esc(title)}${small != null && small !== '' ? `<small>${small}</small>` : ''}</h3><div class="hsv-body">${body}</div></section>`;

// ---------- the rows ----------
function threatSec(s, M, ui) {
  const inv = M.inv;
  let row;
  if (inv && inv.state === 'travel') {
    const v = verdictOf(s, inv), gone = 1 - inv.left / Math.max(1, inv.total);
    row = pickBtn('inv', `${glyph('kill')}<b class="nm">${esc(inv.name)}</b><span class="big">${clock(inv.left)}<small>to your wall</small></span>
      <span class="tags"><span class="tag hot">${esc(labelOf(inv))}</span><span class="tag hot" title="${esc(`Level ${inv.level}; it counts ${countsAt(inv)} at your wall`)}">counts ${countsAt(inv)}</span><span class="tag ${V_TONE[v]}">${esc(V_WORD[v])}</span></span><span class="track"><i style="width:${pct(gone, 1)}"></i></span>`, ui, 'hsv-threat travel');
  } else if (inv) {
    const r = ratioOf(s, inv), bo = bountyOf(s, inv), st = inv.state;
    const big = st === 'watch' ? `${clock(inv.mapLeft)}<small>mapping</small>` : `${Math.round(inv.hp * 100)}%<small>−${pct1(chipRate(r))}/min to you</small>`;
    const word = s.degraded ? 'waiting' : st === 'watch' ? 'mapping' : st === 'siege' ? 'contested' : 'breach';
    row = pickBtn('inv', `${glyph('kill')}<b class="nm">${esc(inv.name)}</b><span class="big">${big}</span>
      <span class="tags"><span class="tag ${st === 'breach' ? 'hot' : 'warn'}">${word}</span><span class="hsv-pay"><span title="${esc(`${MATERIALS[bo.code]?.name || bo.code} for your kill`)}">${glyph(bo.code)}${bo.now >= bo.max ? bo.now : `${bo.now} → ${bo.max}`}</span>${bo.capture ? `<span class="dmn" title="A capture: a sure daemon">${glyph('daemon')}daemon</span>` : ''}</span></span><span class="track"><i style="width:${pct(st === 'watch' ? inv.mapLeft / SCOUT.mapMs : inv.hp, 1)}"></i></span>`, ui, `hsv-threat siege ${st}`);
  } else if (s.degraded) {
    row = pickBtn('core', `${glyph('clock')}<b class="nm">Rebooting</b><span class="big">${fmtTime(degradedLeft(s, M.now))}<small>wall down</small></span><span class="tags"><span class="tag hot">degraded</span></span>`, ui, 'hsv-threat calm down');
  } else {
    const live = invasionsLive(s);
    row = pickBtn('next', `${glyph('clock')}<b class="nm">Next invasion</b><span class="big">${live && s.net?.next > 0 ? `~${fmtTime(s.net.next)}` : '—'}<small>${live ? 'sets out' : 'none sent'}</small></span>
      <span class="tags"><span class="tag dim">from ${M.senders.length} ${M.senders.length === 1 ? 'server' : 'servers'}</span>${M.w.top ? `<span class="tag dim" title="The strongest plain one, grade and all">counts up to lv ${M.w.top}</span>` : ''}${s.net?.open ? '<span class="tag hot">ports open</span>' : ''}</span>`, ui, 'hsv-threat calm');
  }
  const marks = [s.net?.mark ? `<span class="tag hot" title="A scout mapped your wall: the next invasion counts ${s.net.mark} levels higher">mapped +${s.net.mark}</span>` : ''].join('');
  return sec('Threat', marks, row, 'hsv-threat-sec');
}
function wallSec(s, M, ui) {
  const t = tierOf(s), pips = Array.from({ length: TIERS }, (_, i) => `<i class="${i < t ? 'on' : ''}"></i>`).join('');
  const frag = Math.floor(fwOf(s).frag || 0), fl = fragLevels(s), mend = defragging(s, M.now), hard = hardenLeft(s, M.now), held = kitOf(s).harden || 0, open = !!s.net?.open;
  const tiles = [
    pickBtn('wall', `<small>Level</small><span class="v">lv ${effLevel(s, M.now)}<em class="${TONE[M.w.state]}" title="${esc(safetyTip(s, M.w))}">${esc(readout(M.w))}</em></span><span class="hsv-pips" title="${esc(`Tier +${t} of +${TIERS}`)}">${pips}</span>`, ui, 'hsv-tile hsv-level'),
    pickBtn('blocks', `<small>Blocks</small><span class="v sm">${FIREWALL.blocks - frag}/${FIREWALL.blocks}${fl ? `<em class="warn">−${fl} lv</em>` : ''}${mend ? `<em class="you">defrag ${clock(fwOf(s).defragUntil - M.now)}</em>` : ''}</span>`, ui, 'hsv-tile'),
    pickBtn('harden', `<small>harden.sh</small><span class="v sm">${hard ? `<em class="you">+${FIREWALL.harden.plus} · ${fmtTime(hard)}</em>` : held ? `× ${held}` : '<em>none held</em>'}</span>`, ui, 'hsv-tile'),
    pickBtn('ports', `<small>Open ports</small><span class="v sm"><span class="hsv-sw${open ? ' on' : ''}" aria-hidden="true"><i></i></span><em class="${open ? 'hot' : ''}">${open ? 'on' : 'off'}</em></span>`, ui, 'hsv-tile'),
  ].join('');
  return sec('Wall', `+${t} of ${TIERS}`, `<div class="hsv-wall">${tiles}</div>`);
}
const FILTER_ICON = { strength: 'firewall', worm: 'worm', ransomware: 'cipher', ghostroot: 'kernel', frag: 'scrap', defrag: 'repair', grind: 'damage', chip: 'shield', tarpit: 'tarpit', sting: 'spike', evasion: 'evasion', sanitize: 'sanitize', reflect: 'honeypot', reduction: 'reduction', regen: 'regen', shield: 'shield', countermeasures: 'countermeasures' };
// A filter's stats as label chips: +5 lv, 30%, +4 lv vs a family.
const statChips = (f) => Object.entries(f.stats).map(([k, v]) => {
  const x = FILTER_STATS[k], fam = x?.family;
  return { k, icon: FILTER_ICON[k] || 'item', label: k === 'strength' || fam ? `+${v} lv` : /^%/.test(x?.name || '') ? `${v}%` : `+${v}`, what: k === 'strength' ? 'firewall levels' : (x?.name || k).replace(/^ lv /, 'levels ').replace(/^%? ?/, '') };
});
function filtersSec(s, M, ui) {
  const n = slotsOf(s), t = tierOf(s);
  const chip = (i, cls) => { const f = M.held[i], c = statChips(f)[0]; return pickBtn(`filter:${i}`, `${glyph('firewall')}<b class="iname r-${f.rarity}">${esc(f.name)}</b><em>${esc(c?.label || '')}</em>`, ui, `hsv-chip ${cls}`); };
  const chips = [
    ...M.on.map((i) => chip(i, 'in')),
    ...Array.from({ length: Math.max(0, n - M.on.length) }, (_, k) => pickBtn(`slot:${M.on.length + k}`, '<span></span><b>empty slot</b>', ui, 'hsv-chip empty')),
    ...TIER_PERKS.filter((p) => p.perk === 'slot' && p.tier > t).map((p) => `<span class="hsv-chip locked" title="${esc(`Opens at tier +${p.tier}`)}">${glyph('lock')}<b>tier +${p.tier}</b></span>`),
  ].join('');
  const off = M.held.map((_, i) => i).filter((i) => !M.on.includes(i));
  const held = off.length ? `<h4 class="hsv-subh">Held · ${off.length}</h4><div class="hsv-chips">${off.map((i) => chip(i, 'held')).join('')}</div>` : '';
  return sec('Filters', `${M.on.length}/${n}`, `<div class="hsv-chips">${chips}</div>${held}`);
}
function daemonsSec(s, M, ui) {
  const list = slottedDaemons(s), n = daemonSlots(s);
  const chips = [...list.map((id, i) => pickBtn(`daemon:${i}`, `${glyph('daemon')}<b>${esc(DAEMONS[id]?.name || id)}</b><em>${s.daemonLv?.[id] || 1}</em>`, ui, 'hsv-chip dmn')),
    ...Array.from({ length: Math.max(0, n - list.length) }, () => pickBtn('dslot', '<span></span><b>empty slot</b>', ui, 'hsv-chip empty'))].join('');
  return sec('Daemons', `${list.length}/${n}`, `<div class="hsv-chips">${chips || '<span class="hsv-chip empty"><span></span><b>no slot yet</b></span>'}</div>`);
}
const SHOWN = 7;
function sendersSec(s, M, ui) {
  const shown = M.senders.slice(0, M.senders.length > SHOWN + 1 ? SHOWN : SHOWN + 1);
  const chips = shown.map((x, i) => pickBtn(`sender:${i}`, `<span class="dot ${V_TONE[x.meets]}"></span><b>${esc(x.loc.name)}</b><small>lv ${x.loc.level || 1}${x.grade > 1 ? ` v${x.grade}` : ''}</small>`, ui, 'hsv-chip', `Level ${x.loc.level || 1}${x.grade > 1 ? `, v${x.grade}: counts as ${x.counts} at your wall` : ''}. Your wall ${V_WORD[x.meets]}`)).join('')
    + (M.senders.length > shown.length ? pickBtn('senders', `<span></span><b>+${M.senders.length - shown.length} more</b>`, ui, 'hsv-chip more') : '');
  return sec('Senders', M.senders.length, `<div class="hsv-chips">${chips || '<span class="hsv-chip empty" title="Servers you have connected to send invasions"><span></span><b>none yet</b></span>'}</div>`);
}
function networkSec(s, M, ui) {
  const g = sigOf(s, 'you');
  if (!g) return '';
  const n = intelOf(s, 'you'), beaten = Object.entries(n.fam || {}).filter(([f]) => FAMILIES[f]).reduce((a, [, k]) => a + k, 0);
  return sec('Network', '', `<div class="hsv-chips">${pickBtn('network', `${glyph('relay')}<b>${esc(g.name)}</b><small>${beaten} beaten</small>`, ui, 'hsv-chip net')}</div>`);
}
function codeSec(s, M, ui) {
  const mats = materialsOf(s);
  const chips = ['cipher', 'worm', 'kernel', 'exploit'].map((k) => pickBtn('code', `${glyph(k)}<b>${fmt(mats[k] || 0)}</b><small>${esc(MATERIALS[k]?.short || k)}</small>`, ui, 'hsv-chip code', MATERIALS[k]?.name || k)).join('')
    + pickBtn('code', `${glyph('salvage')}<b>${fmt(s.salvage?.length || 0)}</b><small>Components</small>`, ui, 'hsv-chip code', 'Components');
  const known = codebasesOf(s).filter((id) => PROGRAMS[id]), where = runsOn(s);
  const cbs = known.map((id) => pickBtn('codebases', `${glyph('module')}<b>${esc(PROGRAMS[id].name)}</b><small>${where[id] ? `×${where[id].length}` : PROGRAMS[id].weight}</small>`, ui, 'hsv-chip cb', where[id] ? `Running on ${where[id].join(', ')}` : PROGRAMS[id].weight)).join('');
  return sec('Code', '', `<div class="hsv-chips">${chips}</div><h4 class="hsv-subh">Codebases · ${known.length}</h4><div class="hsv-chips">${cbs || pickBtn('codebases', '<span></span><b>none yet</b>', ui, 'hsv-chip empty')}</div>`);
}
const runsOn = (s) => { const where = {}; for (const l of s.locations || []) for (const p of programsOn(l)) (where[p] ||= []).push(l.name); return where; };

// ---------- the panel ----------
// The panel's first pick for the moment: what most wants your eye.
export const firstPick = (s) => (s.invasion ? 'inv' : s.degraded ? 'core' : fragLevels(s) ? 'blocks' : 'wall');
function panel(s, M, ui) {
  const key = ui.sel || firstPick(s);
  let body = detail(s, M, key, ui);
  if (!body) body = detail(s, M, firstPick(s), ui);
  return body;
}
const head = (icon, kick, name, cls = '') => `<div class="hsv-head ${cls}"><span class="hsv-frame">${glyph(icon)}</span><div><small>${esc(kick)}</small><h2>${esc(name)}</h2></div></div>`;
const facts = (xs) => `<div class="hsv-facts">${xs.filter(Boolean).join('')}</div>`;
const tag = (t, cls = '', tip = '') => `<span class="tag ${cls}"${tip ? ` title="${esc(tip)}"` : ''}>${esc(t)}</span>`;
const para = (text, cls = '') => `<p class="hsv-rule ${cls}">${ruleHtml(text)}</p>`;
// An action: a real command. data-preview: it has a before and after to show (previewable).
function act(label, cmd, { cost = null, s = null, primary = false, why = '', tip = '', actId = '', confirm = '' } = {}) {
  return `<button type="button" class="btn${primary && !why ? ' primary' : ''}" data-command="${esc(cmd)}"${previewable(cmd) ? ` data-preview="${esc(cmd)}"` : ''}${actId ? ` data-act="${esc(actId)}"` : ''}${confirm ? ` data-confirm="${esc(confirm)}"` : ''}${why ? ` disabled title="${esc(why)}"` : tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}${cost ? pcost(s, cost) : ''}</button>`;
}
const acts = (xs) => (xs.filter(Boolean).length ? `<div class="hsv-acts">${xs.filter(Boolean).join('')}</div>` : '');

function detail(s, M, key, ui) {
  const [k, i] = String(key).split(':'), now = M.now;
  if (k === 'core') {
    const sv = s.server, cost = topUpCost(s, 'server'), lvl = serverLevel(s), next = serverNext(lvl);
    const rest = CONFIG.restRegen * (s.invasion && ['siege', 'breach'].includes(s.invasion.state) ? 0.5 : 1), toFull = sv.integrity >= sv.max ? 0 : Math.ceil((sv.max - sv.integrity) / (sv.max * rest)) * 60000;
    const tone = sv.integrity / sv.max < 0.3 ? 'hot' : sv.integrity / sv.max < 0.6 ? 'warn' : 'you';
    return head('integrity', 'Your server', 'Integrity', 'you') + facts([tag(`${sv.integrity}/${sv.max}`, tone), tag(`Lv ${lvl}`, 'you'), s.degraded ? tag(`Degraded · ${fmtTime(degradedLeft(s, now))}`, 'hot') : ''])
      + `<div class="hsv-bar ${tone}"><i style="width:${pct(sv.integrity, sv.max)}"></i></div>`
      + para(`Your server's health at home. An invasion that gets past the wall chips it; at 0 it crashes, reboots at half and runs Degraded for ${Math.round(CONFIG.degradedMs / 60000)} minutes with the wall down.`)
      + para(`It rests back ${Math.round(rest * 1000) / 10}% a minute${rest < CONFIG.restRegen ? ' (half while something is at the wall)' : ''}${toFull ? `, full in about ${fmtTime(toFull)}` : ''}.${next ? ` Server ${next}.` : ''}`, 'quiet')
      + acts([act('Repair', 'repair', { cost: cost ? { credits: cost } : null, s, primary: true, actId: 'repair', why: sv.integrity <= 0 ? 'Crashed: it reboots on its own' : !cost ? 'Integrity is full' : M.busy, tip: 'Integrity full now' })]);
  }
  if (k === 'wall') {
    const t = tierOf(s), fp = filterStat(s, 'strength'), bonus = wallBonus(s), fl = fragLevels(s), hard = hardenLeft(s, now), mend = defragging(s, now), up = upgradeCost(s);
    const parts = [`base ${baseOf(s)}`, t ? `+${t} bought` : '', fp ? `+${fp} filters` : '', bonus ? `${bonus > 0 ? '+' : ''}${bonus} consortium` : '', fl ? `−${fl} fragmented` : '', mend ? `−${FIREWALL.defragLoss} defrag` : '', hard ? `+${FIREWALL.harden.plus} harden.sh` : ''].filter(Boolean);
    const nextPerks = TIER_PERKS.filter((p) => p.tier === t + 1).map((p) => p.name);
    const inv = M.inv, w = M.w;
    return head('firewall', 'Firewall', `Level ${effLevel(s, now)}`) + facts([tag(`+${t}`, '', 'Tier bought over the base'), tag(readoutLong(w), TONE[w.state], safetyTip(s, w)), fl ? tag(`−${fl}`, 'warn', 'Fragmented') : ''])
      + `<div class="hsv-sum">${parts.map((x) => `<span>${esc(x)}</span>`).join('<i>·</i>')}</div>`
      + (s.invasion || Object.keys(s.net?.seen || {}).length ? wallRuler(s, false, M.b) : '')
      + (w.state === 'down' ? para('Your wall is down while the server reboots.')
        : para(`It blocks plain invasions up to level ${M.b.blocks} outright and holds them contested up to level ${M.b.holds}.${w.top ? ` Your strongest servers' invasions count as level ${w.top} at your wall (a v2 counts 2 levels over its server, a v3 4).` : ''}${inv && inv.kind !== 'thief' ? ` ${inv.name} counts ${w.at}: your wall ${V_WORD[w.verdict]}.` : ''}`))
      + para(`The base follows your network: your highest server's level, less ${BASE_GAP}. What you buy on top stays.`, 'quiet')
      + `<div class="hsv-perks">${TIER_PERKS.map((x) => `<span class="${x.tier <= t ? 'got' : x.tier === t + 1 ? 'next' : ''}"><b>+${x.tier}</b>${esc(x.name)}</span>`).join('')}</div>`
      + acts([up ? act(`Upgrade to +${t + 1}`, 'firewall upgrade', { cost: { credits: up.credits, cipher: up.cipher, worm: up.worm, kernel: up.kernel }, s, primary: canPay(s, up), actId: 'upgrade', why: M.busy || (!canPay(s, up) ? 'Not enough to pay for it' : ''), tip: `One level more over the base, for good${nextPerks.length ? `. ${nextPerks.join(', ')}` : ''}${fwOf(s).frag ? '. Every block whole again' : ''}` }) : '']);
  }
  if (k === 'blocks') {
    const fw = fwOf(s), frag = Math.floor(fw.frag || 0), fl = fragLevels(s), mend = defragging(s, now), dc = defragCost(s);
    return head('scrap', 'Firewall', 'Fragmentation') + facts([tag(`${FIREWALL.blocks - frag}/${FIREWALL.blocks} whole`, frag ? 'warn' : 'you'), fl ? tag(`−${fl} lv`, 'warn') : '', mend ? tag(`defrag ${clock(fw.defragUntil - now)}`, 'you') : ''])
      + para(`An invasion that gets past the wall cracks it: 1 block when contested, 2 on a breach. Every ${FIREWALL.perLevel} cracked blocks cost a level.`)
      + para(frag ? `Defrag mends every block in ${fmtTime(defragMs(s))}, running ${FIREWALL.defragLoss} levels weaker meanwhile. Buying a tier mends them too.` : 'Every block is whole.', 'quiet')
      + acts([frag || mend ? act(mend ? 'Defragmenting' : 'Defrag', 'firewall defrag', { cost: mend ? null : { credits: dc }, s, primary: !!fl, actId: 'defrag', why: mend ? `Done in ${clock(fw.defragUntil - now)}` : M.busy || (s.server.credits < dc ? 'Not enough credits' : ''), tip: `${FIREWALL.defragLoss} levels down while it runs` }) : '']);
  }
  if (k === 'harden') {
    const held = kitOf(s).harden || 0, hc = hardenCost(s), left = hardenLeft(s, now), hours = FIREWALL.harden.ms / 3600000;
    return head('shield', 'Firewall', 'harden.sh') + facts([tag(held ? `${held} held` : 'none held'), left ? tag(`+${FIREWALL.harden.plus} · ${fmtTime(left)}`, 'you') : ''])
      + para(`One use: +${FIREWALL.harden.plus} levels for ${hours} hours; another adds ${hours} hours more. Kestrel's and NULL CHOIR's shops sell it, and Halcyon's agency stock now and then.`)
      + para(held ? `You hold ${held}.` : 'Holding none, you can write one from code.', 'quiet')
      + acts([act(held ? 'Run harden.sh' : 'Write harden.sh', 'firewall harden', { cost: held ? null : hc, s, actId: 'harden', why: M.busy || (!held && !canPay(s, hc) ? 'Not enough code to write one' : ''), tip: `+${FIREWALL.harden.plus} levels for ${hours} hours` })]);
  }
  if (k === 'ports') {
    const open = !!s.net?.open, live = invasionsLive(s);
    return head('uplink', 'Your server', 'Open ports') + facts([tag(open ? 'on' : 'off', open ? 'hot' : 'dim')])
      + para(`While you play, invasions come 2.5× as often and each pays ${Math.round((CONFIG.invasion.open.reward - 1) * 100)}% more. They close when you log off.`)
      + acts([act(open ? 'Close ports' : 'Open ports', open ? 'close ports' : 'open ports', { actId: 'ports', why: !open && !live ? 'Nothing sends invasions yet' : '' })]);
  }
  if (k === 'inv' && M.inv) return invDetail(s, M);
  if (k === 'next') {
    const live = invasionsLive(s), every = CONFIG.invasion.everyMs.map((x) => Math.round(x / 60000));
    return head('clock', 'Your server', 'Next invasion') + facts([tag(live && s.net?.next > 0 ? `about ${fmtTime(s.net.next)}` : 'none coming'), s.net?.open ? tag('ports open', 'hot') : ''])
      + para(live ? `One sets out ${every[0]}–${every[1]} minutes after the last is dealt with, from a server you've connected to, at its level and grade. Away, one every 2–4 hours.` : 'Servers you have connected to send invasions. None does yet.')
      + para('Before you log off: if the wall reads vulnerable, harden or defrag.', 'quiet');
  }
  if (k === 'streak') {
    const n = streakOf(s);
    return head('xp', 'Your server', `Streak ${n}`) + facts([tag(`+${Math.round((streakMult(s) - 1) * 100)}%`, 'you'), s.net?.sabotage ? tag(`${s.net.sabotage.id} off`, 'hot') : ''])
      + para(`Invasions stopped in a row, by your wall or by you. Each pays ${Math.round(STREAK.step * 100)}% more, up to ${Math.round(STREAK.step * STREAK.max * 100)}%.`)
      + para('A crash or a scout that finishes its map ends it.', 'quiet');
  }
  if (k === 'filter') return filterDetail(s, M, +i);
  if (k === 'slot') {
    const off = M.held.map((f, j) => [f, j]).filter(([, j]) => !M.on.includes(j)), n = slotsOf(s), nextSlot = TIER_PERKS.find((p) => p.perk === 'slot' && p.tier > tierOf(s))?.tier;
    return head('firewall', `Filter · slot ${+i + 1}`, 'Empty slot') + facts([tag(`${M.on.length}/${n} in use`), tag(`${M.held.length}/${FILTER_CAP} held`, 'dim')])
      + para(off.length ? `You hold ${off.length} ${off.length === 1 ? 'filter' : 'filters'} that could go here.` : 'You hold none. Vaults, events and hub shops have them.')
      + (off.length ? `<ul class="hsv-list">${off.map(([f, j]) => `<li><b class="iname r-${f.rarity}">${esc(f.name)}</b><span>${statChips(f).map((c) => `${glyph(c.icon)}${esc(c.label)}`).join(' ')}</span>${act('Put in', `filter equip ${j + 1}`, { actId: 'filter-in', why: M.busy })}</li>`).join('')}</ul>` : '')
      + (nextSlot ? para(`One more slot at tier +${nextSlot}.`, 'quiet') : '');
  }
  if (k === 'daemon') {
    const id = slottedDaemons(s)[+i];
    if (!id) return '';
    const d = DAEMONS[id], lv = s.daemonLv?.[id] || 1;
    return head('daemon', `Daemon · band ${d.band}`, d.name, 'daemon') + facts([tag(`Lv ${lv}`, 'daemon'), tag(daemonWhen(id))])
      + para(daemonText(id, lv))
      + para('It fights beside you when you jack in at the wall, and on every fight you take. Only invasions drop daemons.', 'quiet')
      + acts([`<button type="button" class="btn" data-command="daemons">Daemons</button>`]);
  }
  if (k === 'dslot') {
    const n = daemonSlots(s), next = SERVER.daemonSlotsAt.find((l) => l > serverLevel(s));
    return head('daemon', 'Daemon slot', 'Empty slot', 'daemon') + facts([tag(`${slottedDaemons(s).length}/${n}`, 'daemon')])
      + para(`Every stop rolls for a daemon: 35% your kill at the wall, 50% a thief you intercept, 15% the wall's own, and a champion's capture always.`)
      + (next ? para(`One more slot at server level ${next}.`, 'quiet') : '')
      + acts([`<button type="button" class="btn" data-command="daemons">Daemons</button>`]);
  }
  if (k === 'sender') {
    const x = M.senders[+i];
    if (!x) return '';
    const l = x.loc, fam = FAMILIES[l.family]?.name || l.family, code = codeOf(l.family);
    return head(code || 'kill', 'Sends invasions', l.name) + facts([tag(`Lv ${l.level || 1}`), x.grade > 1 ? tag(`v${x.grade}`, '', `Counts ${2 * (x.grade - 1)} levels higher at your wall`) : '', tag(fam), tag(V_WORD[x.meets], V_TONE[x.meets])])
      + para(`A server you've connected to. It sends ${fam} at level ${l.level || 1}${x.grade > 1 ? `, v${x.grade} from its floor, so a plain one counts as level ${x.counts} at your wall` : ''}. A champion or a pack counts higher still.`)
      + para(`Your wall ${V_WORD[x.meets]} a plain one. Its invasions pay ${MATERIALS[code]?.name || 'code'}.`, 'quiet')
      + acts([`<button type="button" class="btn" data-locate="${esc(l.id)}">On the map</button>`]);
  }
  if (k === 'senders') {
    return head('relay', 'Your network', `Senders · ${M.senders.length}`) + `<ul class="hsv-list">${M.senders.map((x, j) => `<li><b>${esc(x.loc.name)}</b><span><span class="dot ${V_TONE[x.meets]}"></span>lv ${x.loc.level || 1}${x.grade > 1 ? ` v${x.grade} · counts ${x.counts}` : ''}</span>${`<button type="button" class="btn small" data-svkey="sender:${j}">Pick</button>`}</li>`).join('')}</ul>`;
  }
  if (k === 'network') return `<div class="hsv-net">${networkCardMarkup(s, 'you')}</div>`;
  if (k === 'code') {
    const mats = materialsOf(s);
    return head('materials', 'Your server', 'Code') + `<ul class="hsv-stats">${['cipher', 'worm', 'kernel', 'exploit'].map((c) => `<li>${glyph(c)}<b>${fmt(mats[c] || 0)}</b><span>${esc(MATERIALS[c]?.name || c)}</span></li>`).join('')}<li>${glyph('salvage')}<b>${fmt(s.salvage?.length || 0)}</b><span>Components</span></li></ul>`
      + para("Invasions pay their family's code. The wall is where it goes: tiers from +3 and a harden.sh you write. Programs take it too. Hubs buy components.", 'quiet');
  }
  if (k === 'codebases') {
    const known = codebasesOf(s).filter((id) => PROGRAMS[id]), where = runsOn(s);
    return head('module', 'Your network', `Codebases · ${known.length}`) + `<ul class="hsv-list cb">${known.map((id) => `<li class="${where[id] ? 'on' : ''}"><b>${esc(PROGRAMS[id].name)}</b><span>${esc(PROGRAMS[id].weight)}${where[id] ? ` · ×${where[id].length}` : ''}</span><small title="${esc(where[id] ? `Running on ${where[id].join(', ')}` : '')}">${esc(PROGRAMS[id].rule)}</small></li>`).join('')}</ul>`
      + para("Build one in a socket you've cleared on any server.", 'quiet');
  }
  return '';
}
function filterDetail(s, M, i) {
  const f = M.held[i];
  if (!f) return '';
  const inSlot = M.on.includes(i), full = M.on.length >= slotsOf(s);
  return head('firewall', inSlot ? `Filter · slot ${M.on.indexOf(i) + 1}` : 'Filter · held', f.name) + facts([tag(f.rarity, `r-${f.rarity}`), tag(`Lv ${f.level}`), tag(inSlot ? 'in' : 'held', inSlot ? 'you' : 'dim')])
    + `<ul class="hsv-stats">${statChips(f).map((c) => `<li>${glyph(c.icon)}<b>${esc(c.label)}</b><span>${esc(c.what)}</span></li>`).join('')}</ul>`
    + para('Firewall gear. Every filter adds levels; Tuned ones carry 1 or 2 more stats, Custom ones 3.', 'quiet')
    + acts([inSlot ? act('Take out', `filter unequip ${i + 1}`, { actId: 'filter-out', why: M.busy }) : act('Put in', `filter equip ${i + 1}`, { primary: true, actId: 'filter-in', why: M.busy || (full ? 'Every slot is full' : '') }),
      inSlot ? '' : act('Scrap', `filter scrap ${i + 1}`, { actId: 'filter-scrap', why: M.busy, tip: 'For components', confirm: 'Scrap it?' })]);
}
function invDetail(s, M) {
  const inv = M.inv, v = verdictOf(s, inv), bo = bountyOf(s, inv), st = invaderStatus(s), now = M.now;
  const where = inv.state === 'travel' ? `On its way · ${clock(inv.left)}` : inv.state === 'watch' ? `Mapping your wall · ${clock(inv.mapLeft)}` : inv.state === 'siege' ? 'Contested at your wall' : 'Breaking through';
  const kind = KINDS[inv.kind]?.name || 'Raider', r = ratioOf(s, inv);
  // Would harden.sh's +3 turn it away? Run it on a copy and look.
  const h = !hardenLeft(s, now) && v !== 'blocked' && inv.state !== 'watch' && !s.degraded ? previewOf(s, 'firewall harden', now) : null;
  const hardens = h && !h.refused && h.after.verdict === 'blocked';
  const odds = Math.round(daemonChance(s, inv.kind === 'thief' && inv.state === 'travel' ? 'intercept' : 'you') * 100);
  return head('kill', `Invasion · ${kind}`, inv.name, 'hot')
    + facts([tag(`Lv ${inv.level}`, 'hot'), countsAt(inv) !== inv.level ? tag(`counts ${countsAt(inv)}`, 'hot', `It counts ${countsAt(inv) - inv.level} levels higher at your wall`) : '', tag(FAMILIES[inv.family]?.name || inv.family), inv.grade > 1 ? tag(`v${inv.grade}`) : '',
      inv.quirk && QUIRKS[inv.quirk] ? tag(QUIRKS[inv.quirk].name, '', quirkLine(inv)) : '', inv.mutation && MUTATIONS[inv.mutation] ? tag(MUTATIONS[inv.mutation].name, '', MUTATIONS[inv.mutation].rule) : '', inv.strain && STRAINS[inv.strain] ? tag(STRAINS[inv.strain].name, '', STRAINS[inv.strain].rule || '') : '', inv.marked ? tag(`mapped +${inv.marked}`, 'hot') : ''])
    + `<div class="hsv-where ${inv.state}"><b>${esc(where)}</b><small>from ${esc(inv.fromName || '')}</small></div>`
    + (tellOf(s, inv) ? para(tellOf(s, inv)) : '')
    + (s.degraded && inv.state !== 'travel' ? para('It waits at the gate while your server is degraded.')
      : inv.state === 'travel' ? para(`Your wall ${V_WORD[v]} when it arrives.${hardens ? ` harden.sh's +${FIREWALL.harden.plus} would turn it away.` : ''}`, `v-${V_TONE[v]}`)
        : inv.state === 'watch' ? para(`Kill it in the next ${fmtTime(inv.mapLeft)}, or the next invasion counts ${SCOUT.mark} levels higher.`)
          : para(`The wall wears it down ${pct1(grindRate(r))} a minute (${Math.round(inv.hp * 100)}% left) while it chips ${pct1(chipRate(r))} of your Integrity a minute.`))
    + `<div class="hsv-pay"><span title="${esc(`${MATERIALS[bo.code]?.name || bo.code} for your kill`)}">${glyph(bo.code)}<b>${bo.now >= bo.max ? bo.now : `${bo.now} → ${bo.max}`}</b></span><span class="dmn" title="${esc(bo.capture ? `A capture: a sure daemon of band ${daemonBand(inv.level)}` : `The chance your kill leaves a daemon (band ${daemonBand(inv.level)})`)}">${glyph('daemon')}<b>${bo.capture ? 'daemon' : `${odds}%`}</b></span>${streakOf(s) ? `<span title="${esc(`A streak of ${streakOf(s)}`)}">${glyph('xp')}<b>+${Math.round((streakMult(s) - 1) * 100)}%</b></span>` : ''}</div>`
    + para(`Your kill pays the bounty; it grows the longer it sits contested. The wall wearing it down pays ${bo.wall}, an outright block ${bo.blocked}.`, 'quiet')
    + acts([inv.state === 'travel' && !st?.intercept ? '' : st?.intercept ? act('Intercept', 'intercept', { primary: true, actId: 'jack', why: st.can ? '' : st.why }) : act('Jack in', 'jack in', { primary: true, actId: 'jack', why: st?.can ? '' : st?.why || 'Not now', tip: 'Fight it at the wall, worn down, for a full kill' }),
      hardens ? act('harden.sh', 'firewall harden', { cost: kitOf(s).harden ? null : hardenCost(s), s, actId: 'harden', why: M.busy, tip: `+${FIREWALL.harden.plus} levels for ${FIREWALL.harden.ms / 3600000} hours: your wall would stop it` }) : '']);
}

// ---------- the page ----------
// ui: { sel: the picked key, open: the phone's sheet is up, preview: the command whose before and after shows }.
export function serverMarkup(s, now = Date.now(), ui = {}) {
  const M = model(s, now), u = { sel: ui.sel || firstPick(s), open: !!ui.open, preview: ui.preview || null };
  const card = `<section class="hsv-card" aria-label="Your server">${header(s, M, u)}${threatSec(s, M, u)}${wallSec(s, M, u)}${filtersSec(s, M, u)}${daemonsSec(s, M, u)}${sendersSec(s, M, u)}${networkSec(s, M, u)}${codeSec(s, M, u)}</section>`;
  const prev = u.preview ? previewMarkup(s, u.preview, now) : '';
  const verb = u.preview ? { repair: 'repair', 'firewall upgrade': 'upgrade', 'firewall defrag': 'defrag', 'firewall harden': 'run harden.sh', 'open ports': 'open ports', 'close ports': 'close ports' }[u.preview] || (/equip/.test(u.preview) ? (/unequip/.test(u.preview) ? 'take it out' : 'put it in') : '') : '';
  const side = `<aside class="hsv-panel${u.open ? ' open' : ''}" id="hsv-panel" aria-label="Details"><button type="button" class="hsv-close" data-hsv-close aria-label="Close">×</button>${panel(s, M, u)}<div class="hsv-prev" aria-live="polite">${prev ? `<small>If you ${esc(verb)}</small>${prev}` : ''}</div></aside>`;
  return `<div class="hsv-page">${card}${side}</div>`;
}
